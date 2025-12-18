$dist = "dist"
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist
New-Item -ItemType Directory -Path "$dist/lib"

Write-Host "Copying Source and Assets..."
# Copy with exclusion of backup files
Copy-Item "src" -Destination $dist -Recurse
Copy-Item "sprites" -Destination $dist -Recurse
Copy-Item "sounds" -Destination $dist -Recurse

# Cleanup any backup files that slipped in
Get-ChildItem -Path $dist -Recurse -Filter "*~" | Remove-Item -Force

Write-Host "Copying Library..."
Copy-Item "node_modules/kaplay/dist/kaplay.mjs" -Destination "$dist/lib/kaplay.mjs"

Write-Host "Creating index.html..."
$htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panda Infinite Runner</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        canvas {
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
    </style>
</head>
<body>
    <script type="module">
        import kaplay from "./lib/kaplay.mjs";
        window.kaplay = kaplay;
    </script>
    <script type="module" src="./src/main.js"></script>
</body>
</html>
"@
Set-Content -Path "$dist/index.html" -Value $htmlContent -Encoding UTF8

Write-Host "Zipping..."
if (Test-Path "PandaRun_Web.zip") { Remove-Item "PandaRun_Web.zip" -Force }

# Change path to dist
Push-Location $dist
try {
    # Use tar instead of Compress-Archive to ensure cross-platform compatibility (Forward Slashes)
    # -a: Auto-detect compression (zip) based on extension
    # -c: Create
    # -f: Filename
    # *: All files
    tar -a -c -f "..\PandaRun_Web.zip" *
}
finally {
    Pop-Location
}

Write-Host "Done! Distribution ready in PandaRun_Web.zip"
