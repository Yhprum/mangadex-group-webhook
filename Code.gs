const TRIGGER_INTERVAL = 10;

const API_URL = "https://api.mangadex.org";
const LANGUAGE = "en";

function main() {
  const webhooks = get_array_from_sheets("webhooks", columns = 2);
  const groups = get_array_from_sheets("feeds", columns = 1).map(x => x[0]);
  const roles = get_array_from_sheets("roles", columns = 2);

  const updates = check_group_updates(groups[0]);

  for (const [webhook, message] of webhooks)
    post_updates(webhook, updates, roles, message);
}

function post_updates(webhook, updates, roles, message = "") {
  for (const chapter of updates) {
    const scanlation_group = chapter.relationships.find(c => c.type == "scanlation_group");
    const manga = chapter.relationships.find(c => c.type == "manga")
    
    const cover_url = API_URL + "/cover?manga[]=" + manga.id;
    const cover = request(cover_url, "GET");
    
    const scanlation_group_name = scanlation_group != null ? scanlation_group.attributes.name : "No Group";
    const chapter_title = chapter.attributes.title || "";

    const thumbnail_url = "https://uploads.mangadex.org/covers/" + manga.id + "/" + cover.data[0].attributes.fileName;
    
    const role = roles.find(r => r[0] == manga.id);
    if (role)
      message = role[1];

    const payload = {
      "content": message,
      "embeds": [
        {
          "title": "Ch." + chapter.attributes.chapter + " - " + manga.attributes.title.en,
          "description": chapter_title + "\nGroup: " + scanlation_group_name,
          "color": 16742144,
          "footer": {
            "text": "New update available"
          },
          "url": "https://mangadex.org/chapter/" + chapter.id,
          "timestamp": chapter.attributes.createdAt,
          "thumbnail": {
            "url": thumbnail_url
          }
        }
      ]
    };
    
    post_webhook(webhook, payload);
  }
}

function check_group_updates(group_id) {
  const previous_check = new Date(Date.now() - TRIGGER_INTERVAL * 60000);
  const str_previous_check = previous_check.toISOString().substring(0, previous_check.toISOString().indexOf('.'));

  const feed_parameters = "?includes[]=scanlation_group&includes[]=manga&groups[]=" + group_id + "&translatedLanguage[]=" + LANGUAGE + "&createdAtSince=" + str_previous_check;
  const feed_url = API_URL + "/chapter" + feed_parameters;
  const feed = request(feed_url);

  return feed.data;
}

function post_webhook(webhook, payload) {
  request(webhook, "POST", payload);
}

function get_type_id(item, type) {
  for (const relationship of item.relationships)
    if (relationship.type == type)
      return relationship.id;
  
  return null;
}