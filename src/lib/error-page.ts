// Self-contained error page HTML. Must not import any app code so a
// module-init failure elsewhere cannot break the fallback.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Something went wrong</title>
<style>
  html,body{margin:0;padding:0;height:100%;background:#0a0a0a;color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:480px;text-align:center}
  h1{font-size:22px;margin:0 0 8px;font-weight:600}
  p{color:#a3a3a3;margin:0 0 24px;line-height:1.5}
  .row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  a,button{appearance:none;border:1px solid #2a2a2a;background:#171717;color:#f5f5f5;padding:10px 18px;border-radius:8px;font:inherit;cursor:pointer;text-decoration:none}
  a.primary,button.primary{background:#f5f5f5;color:#0a0a0a;border-color:#f5f5f5}
</style>
</head>
<body>
  <div class="wrap"><div class="card">
    <h1>Something went wrong</h1>
    <p>The server hit an unexpected error. Please try again in a moment.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Refresh</button>
      <a href="/">Go home</a>
    </div>
  </div></div>
</body>
</html>`;
}
