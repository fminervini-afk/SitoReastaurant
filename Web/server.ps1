$ErrorActionPreference = "Stop"

$port = 3000
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cartFilePath = Join-Path $rootDir "data\carrello.json"

if (-not (Test-Path $cartFilePath)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $cartFilePath) -Force | Out-Null
  Set-Content -Path $cartFilePath -Value "{`n  \"updatedAt\": null,`n  \"totalItems\": 0,`n  \"totalPrice\": 0,`n  \"items\": []`n}" -Encoding UTF8
}

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".ico" = "image/x-icon"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".svg" = "image/svg+xml"
  ".webm" = "video/webm"
  ".mp4" = "video/mp4"
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)] [System.Net.HttpListenerContext] $Context,
    [Parameter(Mandatory = $true)] [int] $StatusCode,
    [Parameter(Mandatory = $true)] $Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 20
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.OutputStream.Close()
}

function Write-BytesResponse {
  param(
    [Parameter(Mandatory = $true)] [System.Net.HttpListenerContext] $Context,
    [Parameter(Mandatory = $true)] [int] $StatusCode,
    [Parameter(Mandatory = $true)] [byte[]] $Bytes,
    [Parameter(Mandatory = $true)] [string] $ContentType,
    [Parameter(Mandatory = $false)] [bool] $SendBody = $true
  )

  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = $ContentType
  $Context.Response.ContentLength64 = $Bytes.Length

  if ($SendBody) {
    $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  }

  $Context.Response.OutputStream.Close()
}

function Get-ContentType {
  param([Parameter(Mandatory = $true)] [string] $FilePath)

  $extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
  if ($mimeTypes.ContainsKey($extension)) {
    return $mimeTypes[$extension]
  }

  return "application/octet-stream"
}

function Handle-CartRequest {
  param([Parameter(Mandatory = $true)] [System.Net.HttpListenerContext] $Context)

  $request = $Context.Request

  if ($request.HttpMethod -eq "POST") {
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $rawBody = $reader.ReadToEnd()
    $reader.Close()

    try {
      $parsed = $rawBody | ConvertFrom-Json -ErrorAction Stop
      $formattedJson = $parsed | ConvertTo-Json -Depth 20
      Set-Content -Path $cartFilePath -Value $formattedJson -Encoding UTF8
      Write-JsonResponse -Context $Context -StatusCode 200 -Payload @{ ok = $true }
    } catch {
      Write-JsonResponse -Context $Context -StatusCode 400 -Payload @{ error = "Invalid JSON payload" }
    }

    return
  }

  if ($request.HttpMethod -eq "GET") {
    try {
      $content = Get-Content -Path $cartFilePath -Raw -Encoding UTF8
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
      Write-BytesResponse -Context $Context -StatusCode 200 -Bytes $bytes -ContentType "application/json; charset=utf-8"
    } catch {
      Write-JsonResponse -Context $Context -StatusCode 500 -Payload @{ error = "Failed to read cart file" }
    }

    return
  }

  Write-JsonResponse -Context $Context -StatusCode 405 -Payload @{ error = "Method not allowed" }
}

function Resolve-StaticPath {
  param([Parameter(Mandatory = $true)] [string] $AbsolutePath)

  $relativePath = if ($AbsolutePath -eq "/") { "index.html" } else { [Uri]::UnescapeDataString($AbsolutePath.TrimStart('/')) }
  $relativePath = $relativePath -replace '/', '\\'

  $combinedPath = Join-Path $rootDir $relativePath
  $resolvedPath = [System.IO.Path]::GetFullPath($combinedPath)
  $resolvedRoot = [System.IO.Path]::GetFullPath($rootDir)

  if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  return $resolvedPath
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server avviato su http://localhost:$port"
Write-Host "Premi CTRL+C per fermare il server"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $path = $request.Url.AbsolutePath

    if ($path -eq "/api/carrello") {
      Handle-CartRequest -Context $context
      continue
    }

    if ($request.HttpMethod -ne "GET" -and $request.HttpMethod -ne "HEAD") {
      Write-JsonResponse -Context $context -StatusCode 405 -Payload @{ error = "Method not allowed" }
      continue
    }

    $filePath = Resolve-StaticPath -AbsolutePath $path

    if (-not $filePath) {
      Write-JsonResponse -Context $context -StatusCode 403 -Payload @{ error = "Forbidden" }
      continue
    }

    if (-not (Test-Path $filePath -PathType Leaf)) {
      Write-JsonResponse -Context $context -StatusCode 404 -Payload @{ error = "File not found" }
      continue
    }

    try {
      $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
      $contentType = Get-ContentType -FilePath $filePath
      $sendBody = $request.HttpMethod -ne "HEAD"
      Write-BytesResponse -Context $context -StatusCode 200 -Bytes $fileBytes -ContentType $contentType -SendBody $sendBody
    } catch {
      Write-JsonResponse -Context $context -StatusCode 500 -Payload @{ error = "Internal server error" }
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }

  $listener.Close()
}
