const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'hostelfix_student_token';
const USER_KEY = 'hostelfix_student_user';

let onUnauthorizedCallback = null;

export function setOnUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof onUnauthorizedCallback === 'function') {
      onUnauthorizedCallback();
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function loginStudent({ identifier, password }) {
  const payload = {
    role: 'student',
    password,
  };

  if (identifier && identifier.includes('@')) {
    payload.email = identifier.trim();
  } else {
    payload.student_id = identifier ? identifier.trim() : '';
  }

  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.token) {
    setToken(res.token);
  }
  if (res.user) {
    setUser(res.user);
  }

  return res;
}

export async function fetchLocations(params = {}) {
  const query = new URLSearchParams();
  if (params.floor_no !== undefined) query.set('floor_no', params.floor_no);
  if (params.location_type) query.set('location_type', params.location_type);
  if (params.hostel_id) query.set('hostel_id', params.hostel_id);

  const qs = query.toString();
  return apiRequest(`/locations${qs ? `?${qs}` : ''}`);
}

export async function fetchAssets(params = {}) {
  const query = new URLSearchParams();
  if (params.location_id) query.set('location_id', params.location_id);
  if (params.category) query.set('category', params.category);

  const qs = query.toString();
  return apiRequest(`/assets${qs ? `?${qs}` : ''}`);
}

export async function fetchComplaints(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.set('status', params.status);
  if (params.priority && params.priority !== 'All') query.set('priority', params.priority);

  const qs = query.toString();
  return apiRequest(`/complaints${qs ? `?${qs}` : ''}`);
}

export async function fetchComplaintById(id) {
  return apiRequest(`/complaints/${id}`);
}

export async function submitComplaint({ location_id, description, priority, asset_id }) {
  const user = getUser();
  const payload = {
    location_id: Number(location_id),
    description: description.trim(),
  };

  if (user && user.student_id) {
    payload.student_id = user.student_id;
  }

  if (priority && priority !== 'Urgent') {
    payload.priority = priority;
  }
  if (asset_id) {
    payload.asset_id = Number(asset_id);
  }

  return apiRequest('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
