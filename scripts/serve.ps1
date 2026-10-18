param(
  [int]$Port = 8080,
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"
if (-not $Root) { $Root = Join-Path (Split-Path $PSScriptRoot -Parent) "app" }
$Root = (Resolve-Path $Root).Path

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".json" = "application/json"
  ".webmanifest" = "application/manifest+json"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Serving $Root at $prefix"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
  $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
  if (-not $full.StartsWith($Root)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }
  if (Test-Path $full -PathType Container) { $full = Join-Path $full "index.html" }
  if (-not (Test-Path $full -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
    continue
  }
  $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
  $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
