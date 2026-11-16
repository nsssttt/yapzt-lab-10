import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

export async function request(path, { method = "GET", data, token } = {}) {
  const headers = { Accept: "application/json" };
  if (data !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new HttpError(response.status, method, path, raw);
  }
  const body = raw ? JSON.parse(raw) : null;
  console.log(`${method} ${path} -> ${response.status}`, JSON.stringify(body));
  return { status: response.status, body };
}

export class HttpError extends Error {
  constructor(status, method, path, raw) {
    super(`${method} ${path}: HTTP ${status} ${raw}`);
    this.status = status;
  }
}

export const getPost = (id) => request(`/posts/${encodeURIComponent(id)}`);
export const createPost = (title, body, userId, token) =>
  request("/posts", { method: "POST", data: { title, body, userId }, token });
export const updateProfile = (id, name, email) =>
  request(`/profiles/${encodeURIComponent(id)}`, { method: "PUT", data: { id, name, email } });
export const deleteComment = (id) =>
  request(`/comments/${encodeURIComponent(id)}`, { method: "DELETE" });

export async function main() {
  const all = await request("/posts");
  assert.deepEqual(all.body.map(({ id }) => id), [1, 2]);

  const post = await createPost("Fetch Post", "Created via fetch", 1);
  assert.equal(post.status, 201);
  assert.equal(post.body.title, "Fetch Post");

  const data = { id: 1, title: "Fetch Updated", body: "Content updated via fetch", userId: 1 };
  assert.deepEqual((await request("/posts/1", { method: "PUT", data })).body, data);
  assert.deepEqual((await getPost(1)).body, data);
  const filtered = await request("/posts?userId=2");
  assert.deepEqual(filtered.body.map(({ title }) => title), ["Second Post"]);
  console.log("User 2 titles:", filtered.body.map(({ title }) => title).join(", "));

  const profiles = await request("/profiles");
  assert.deepEqual(profiles.body.map(({ name }) => name), ["Alice", "Bob"]);
  console.log("Profile names:", profiles.body.map(({ name }) => name).join(", "));
  assert.equal((await updateProfile(2, "Robert", "robert@example.com")).body.name, "Robert");
  assert.equal((await deleteComment(1)).status, 200);
  await assert.rejects(request("/comments/1"), { status: 404 });
  console.log("GET /comments/1 -> 404 (verified)");

  const [posts, comments] = await Promise.all([request("/posts"), request("/comments")]);
  for (const { id, title } of posts.body) {
    const attached = comments.body.filter(({ postId }) => postId === id);
    console.log(`Post ${id} "${title}": ${attached.length} comment(s)`, attached.map(({ body }) => body));
  }
  assert.equal(comments.body.filter(({ postId }) => postId === 2).length, 2);

  assert.equal((await request("/posts/2", { method: "DELETE" })).status, 200);
  await assert.rejects(getPost(2), { status: 404 });
  console.log("GET /posts/2 -> 404 (verified)");

  const started = performance.now();
  await request("/posts");
  console.log("GET /posts including body:", (performance.now() - started).toFixed(2), "ms");

  const withToken = await createPost("Bearer Fetch Post", "Demo token", 2, "123456");
  assert.equal(withToken.status, 201);
  assert.equal(withToken.body.userId, 2);
  console.log("Fetch checks passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
