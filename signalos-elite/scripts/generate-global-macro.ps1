Add-Type -AssemblyName System.Drawing

$random = [System.Random]::new(29)
$outDir = "C:\Users\dougp\Projects\Signalos\signalos\signalos-elite\public\backgrounds"
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$outPath = Join-Path $outDir "global-macro.png"
$width = 480
$height = 270
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 10, 4, 28)), ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), 90
$g.FillRectangle($bgBrush, $rect)

$starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(68, 185, 120, 255))
for ($i = 0; $i -lt 240; $i++) {
  $x = $random.Next(0, $width)
  $y = $random.Next(0, $height)
  $size = $random.Next(1, 3)
  $g.FillEllipse($starBrush, $x, $y, $size, $size)
}

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(28, 130, 80, 255), 1)
for ($x = -160; $x -lt $width + 160; $x += 24) {
  $g.DrawLine($gridPen, $x, $height, $x + 168, [int]($height * 0.76))
}
for ($y = 0; $y -lt 10; $y++) {
  $curve = New-Object System.Drawing.Drawing2D.GraphicsPath
  $baseY = [int]($height * 0.77 + $y * 15)
  $curve.AddBezier(0, $baseY, 150, $baseY - 11, 320, $baseY + 18, $width, $baseY - 4)
  $g.DrawPath($gridPen, $curve)
  $curve.Dispose()
}

$horizonGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 190, 100, 255), 20)
$horizonMid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(92, 210, 120, 255), 10)
$horizonPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(245, 230, 160, 255), 2.6)
$horizon = New-Object System.Drawing.Drawing2D.GraphicsPath
$horizon.AddBezier(-28, 228, 110, 215, 330, 216, 508, 228)
$g.DrawPath($horizonGlow, $horizon)
$g.DrawPath($horizonMid, $horizon)
$g.DrawPath($horizonPen, $horizon)

$mapBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(145, 196, 120, 255))
function Add-DotCloud([System.Drawing.Graphics]$graphics, [System.Drawing.Brush]$brush, [System.Random]$rng, [int]$cx, [int]$cy, [int]$rx, [int]$ry, [int]$count) {
  for ($i = 0; $i -lt $count; $i++) {
    $angle = $rng.NextDouble() * [Math]::PI * 2
    $radius = [Math]::Sqrt($rng.NextDouble())
    $x = [int]($cx + [Math]::Cos($angle) * $rx * $radius)
    $y = [int]($cy + [Math]::Sin($angle) * $ry * $radius)
    $graphics.FillEllipse($brush, $x, $y, 2, 2)
  }
}

Add-DotCloud $g $mapBrush $random 58 42 44 16 340
Add-DotCloud $g $mapBrush $random 80 64 24 16 150
Add-DotCloud $g $mapBrush $random 118 108 18 34 120
Add-DotCloud $g $mapBrush $random 220 48 56 22 420
Add-DotCloud $g $mapBrush $random 236 94 22 46 170
Add-DotCloud $g $mapBrush $random 332 44 86 24 520
Add-DotCloud $g $mapBrush $random 390 78 46 18 160
Add-DotCloud $g $mapBrush $random 422 132 28 16 120

$outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 190, 140, 255), 1)
$g.DrawArc($outlinePen, 14, 16, 100, 48, 192, 150)
$g.DrawArc($outlinePen, 52, 46, 54, 36, 182, 160)
$g.DrawArc($outlinePen, 170, 22, 116, 54, 188, 162)
$g.DrawArc($outlinePen, 212, 60, 60, 82, 176, 150)
$g.DrawArc($outlinePen, 278, 24, 132, 60, 188, 162)
$g.DrawArc($outlinePen, 340, 62, 76, 48, 180, 155)
$g.DrawArc($outlinePen, 392, 118, 58, 30, 188, 150)

$nodeGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(56, 220, 150, 255))
$nodeCore = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 240, 185, 255))
$nodes = @(
  [System.Drawing.Point]::new(56, 60), [System.Drawing.Point]::new(102, 106), [System.Drawing.Point]::new(150, 138),
  [System.Drawing.Point]::new(226, 78), [System.Drawing.Point]::new(260, 118), [System.Drawing.Point]::new(330, 86),
  [System.Drawing.Point]::new(398, 95), [System.Drawing.Point]::new(444, 136)
)
foreach ($node in $nodes) {
  $g.FillEllipse($nodeGlow, $node.X - 9, $node.Y - 9, 18, 18)
  $g.FillEllipse($nodeCore, $node.X - 2, $node.Y - 2, 4, 4)
}

$arcGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(26, 220, 140, 255), 4)
$arcPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(165, 225, 160, 255), 1.25)
$arcs = @(
  @(56, 60, 102, 106, 26), @(56, 60, 150, 138, 44), @(56, 60, 226, 78, 74), @(56, 60, 330, 86, 96),
  @(102, 106, 150, 138, 18), @(150, 138, 226, 78, 46), @(226, 78, 260, 118, 18), @(226, 78, 330, 86, 48),
  @(260, 118, 398, 95, 56), @(330, 86, 398, 95, 22), @(330, 86, 444, 136, 52), @(398, 95, 444, 136, 22)
)
foreach ($arc in $arcs) {
  $x1 = [int]$arc[0]
  $y1 = [int]$arc[1]
  $x2 = [int]$arc[2]
  $y2 = [int]$arc[3]
  $lift = [int]$arc[4]
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier($x1, $y1, $x1 + (($x2 - $x1) / 3), $y1 - $lift, $x1 + (2 * (($x2 - $x1) / 3)), $y2 - $lift, $x2, $y2)
  $g.DrawPath($arcGlow, $path)
  $g.DrawPath($arcPen, $path)
  $path.Dispose()
}

$overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(28, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(90, 0, 0, 0)), 0
$g.FillRectangle($overlayBrush, $rect)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath
