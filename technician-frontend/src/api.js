const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'hostelfix_technician_token';
const USER_KEY = 'hostelfix_technician_user';

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

export async function loginTechnician({ identifier, password }) {
  const payload = {
    role: 'technician',
    password,
  };

  if (identifier && /^\d+$/.test(identifier.trim())) {
    // If 10 digits or starts with 9/8/7, it could be a phone number
    const trimmed = identifier.trim();
    if (trimmed.length >= 10) {
      payload.phone = trimmed;
    } else {
      payload.technician_id = parseInt(trimmed, 10);
    }
  } else if (identifier) {
    payload.phone = identifier.trim();
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

export async function fetchAssignments(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') {
    query.set('status', params.status);
  }
  if (params.priority && params.priority !== 'All') {
    query.set('priority', params.priority);
  }

  const qs = query.toString();
  return apiRequest(`/technician/assignments${qs ? `?${qs}` : ''}`);
}

export async function fetchAssignmentById(id) {
  return apiRequest(`/technician/assignments/${id}`);
}

export async function updateAssignmentStatus(assignmentId, { status, remarks }) {
  return apiRequest(`/technician/assignments/${assignmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      remarks: remarks || `Status marked as ${status} by technician`,
    }),
  });
}

export async function fetchAssets(params = {}) {
  const query = new URLSearchParams();
  if (params.location_id) query.set('location_id', params.location_id);
  if (params.category) query.set('category', params.category);

  const qs = query.toString();
  return apiRequest(`/assets${qs ? `?${qs}` : ''}`);
}
