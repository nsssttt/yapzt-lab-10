import json
import os
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter
from urllib.error import HTTPError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000")


def request(path, method="GET", data=None, token=None):
    headers = {"Accept": "application/json"}
    payload = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(data).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(urljoin(BASE_URL, path), data=payload, headers=headers, method=method)
    try:
        with urlopen(req, timeout=5) as response:
            raw = response.read()
            body = json.loads(raw) if raw else None
            print(f"{method} {path} -> {response.status}")
            return response.status, body
    except HTTPError as error:
        print(f"{method} {path} -> {error.code}")
        raise


def assert_deleted(path):
    try:
        request(path)
    except HTTPError as error:
        if error.code != 404:
            raise
    else:
        raise AssertionError(f"{path} was not deleted")


def main():
    _, posts = request("/posts")
    assert [post["id"] for post in posts] == [1, 2]

    status, added = request(
        "/posts", "POST", {"title": "Python Post", "body": "Created by urllib", "userId": 1}
    )
    assert status == 201 and added["title"] == "Python Post"

    updated = {"id": 1, "title": "Python Updated", "body": "Replacement", "userId": 1}
    assert request("/posts/1", "PUT", updated) == (200, updated)
    assert request("/posts/1") == (200, updated)

    query = urlencode({"userId": 2})
    _, filtered = request(f"/posts?{query}")
    assert [post["title"] for post in filtered] == ["Second Post"]

    _, profiles = request("/profiles")
    assert [profile["name"] for profile in profiles] == ["Alice", "Bob"]
    profile = {"id": 2, "name": "Robert", "email": "robert@example.com"}
    assert request("/profiles/2", "PUT", profile) == (200, profile)

    assert request("/comments/1", "DELETE")[0] == 200
    assert_deleted("/comments/1")
    with ThreadPoolExecutor(max_workers=2) as pool:
        posts_task = pool.submit(request, "/posts")
        comments_task = pool.submit(request, "/comments")
        _, posts = posts_task.result()
        _, comments = comments_task.result()
    counts = {post["id"]: sum(c["postId"] == post["id"] for c in comments) for post in posts}
    assert counts == {1: 0, 2: 2, added["id"]: 0}
    print("Comments by post:", counts)

    assert request("/posts/2", "DELETE")[0] == 200
    assert_deleted("/posts/2")
    started = perf_counter()
    request("/posts")
    print(f"GET /posts including body: {(perf_counter() - started) * 1000:.2f} ms")

    status, body = request(
        "/posts", "POST", {"title": "Python Bearer Post", "body": "Demo token", "userId": 2},
        token="lab10-demo-token",
    )
    assert status == 201 and body["title"] == "Python Bearer Post"
    print("Python API checks passed.")


if __name__ == "__main__":
    main()

