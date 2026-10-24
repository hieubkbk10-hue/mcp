import sys
import json
import itertools
from youtube_comment_downloader import YoutubeCommentDownloader, SORT_BY_POPULAR, SORT_BY_RECENT

def fetch_comments(url_or_id, limit=20, sort="popular"):
    downloader = YoutubeCommentDownloader()
    sort_mode = SORT_BY_RECENT if sort == "recent" else SORT_BY_POPULAR
    
    url = url_or_id
    if not url.startswith("http"):
        url = f"https://www.youtube.com/watch?v={url_or_id}"
        
    comments_gen = downloader.get_comments_from_url(url, sort_by=sort_mode)
    results = []
    
    for c in itertools.islice(comments_gen, limit):
        results.append({
            "author": c.get("author", "Ẩn danh"),
            "text": c.get("text", ""),
            "votes": c.get("votes", "0"),
            "time": c.get("time", ""),
            "reply": c.get("reply", False)
        })
        
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)
        
    target = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    sort_type = sys.argv[3] if len(sys.argv) > 3 else "popular"
    
    try:
        data = fetch_comments(target, limit=count, sort=sort_type)
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
