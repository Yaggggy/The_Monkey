const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const buildUrl = (path, params = {}) => {
  const url = new URL(baseUrl + path);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const request = async (pathOrUrl, options = {}) => {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : baseUrl + pathOrUrl;
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // Ignore JSON parse errors.
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const api = {
  listCameras: (params) => request(buildUrl("/cameras/", params)),
  createCamera: (payload) =>
    request("/cameras/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  updateCamera: (cameraId, payload) =>
    request(`/cameras/${cameraId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  deleteCamera: (cameraId) =>
    request(`/cameras/${cameraId}`, {
      method: "DELETE"
    }),
  listEvents: (params) => request(buildUrl("/events/", params)),
  createUser: (payload) =>
    request("/users/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  listUsers: (params) => request(buildUrl("/users/", params)),
  deleteUser: (userId) =>
    request(`/users/${userId}`, {
      method: "DELETE"
    }),
  inferImage: async (file, cameraId) => {
    const formData = new FormData();
    formData.append("image", file);
    const url = buildUrl("/events/infer", { camera_id: cameraId });
    const response = await fetch(url, { method: "POST", body: formData });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Inference failed");
    }
    return response.json();
  },
  inferStream: (payload) =>
    request("/events/infer-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  getLiveStreamUrl: (payload) => {
    const params = new URLSearchParams();
    if (payload.camera_id) params.set("camera_id", payload.camera_id);
    if (payload.stream_url) params.set("stream_url", payload.stream_url);
    return `${baseUrl}/events/live-stream?${params.toString()}`;
  }
};
