function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Don't rewrite requests for files with extensions (JS, CSS, images, etc)
  if (uri.includes('.')) {
    return request;
  }

  // Add trailing slash if missing
  if (!uri.endsWith('/')) {
    uri += '/';
  }

  // Append index.html for directory-like paths
  request.uri = uri + 'index.html';

  return request;
}
