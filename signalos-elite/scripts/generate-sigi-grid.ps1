Add-Type -AssemblyName System.Drawing

$random = [System.Random]::new(11)
$outDir = "C:\Users\dougp\Projects\Signalos\signalos\signalos-elite\public\backgrounds"
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$outPath = Join-Path $outDir "sigi-grid.png"
$width = 480
$height = 270
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 4, 10, 26)), ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), 90
$g.FillRectangle($bgBrush, $rect)

$starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(78, 90, 170, 255))
for ($i = 0; $i -lt 320; $i++) {
  $x = $random.Next(0, $width)
  $y = $random.Next(0, [int]($height * 0.82))
  $size = $random.Next(1, 3)
  $g.FillEllipse($starBrush, $x, $y, $size, $size)
}

$wirePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(34, 55, 125, 235), 1)
for ($x = -132; $x -lt $width + 132; $x += 22) {
  $g.DrawLine($wirePen, $x, $height, $x + 148, [int]($height * 0.64))
}
for ($y = 0; $y -lt 12; $y++) {
  $curve = New-Object System.Drawing.Drawing2D.GraphicsPath
  $baseY = [int]($height * 0.69 + $y * 13)
  $curve.AddBezier(0, $baseY, 128, $baseY - 10, 300, $baseY + 26, $width, $baseY + 2)
  $g.DrawPath($wirePen, $curve)
  $curve.Dispose()
}

$waveGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(42, 20, 220, 255), 22)
$waveMid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(88, 40, 225, 255), 11)
$wavePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(240, 110, 240, 255), 3)
$wave = New-Object System.Drawing.Drawing2D.GraphicsPath
$wave.AddBezier(-18, 198, 96, 126, 222, 250, 360, 176)
$wave.AddBezier(360, 176, 404, 150, 438, 128, 498, 88)
$g.DrawPath($waveGlow, $wave)
$g.DrawPath($waveMid, $wave)
$g.DrawPath($wavePen, $wave)

$linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(130, 100, 180, 255), 1.35)
$linePts = @(
  [System.Drawing.PointF]::new(20, 154), [System.Drawing.PointF]::new(52, 162), [System.Drawing.PointF]::new(72, 140),
  [System.Drawing.PointF]::new(108, 170), [System.Drawing.PointF]::new(150, 138), [System.Drawing.PointF]::new(194, 150),
  [System.Drawing.PointF]::new(228, 122), [System.Drawing.PointF]::new(262, 164), [System.Drawing.PointF]::new(302, 142),
  [System.Drawing.PointF]::new(336, 112), [System.Drawing.PointF]::new(372, 120), [System.Drawing.PointF]::new(408, 84),
  [System.Drawing.PointF]::new(456, 34)
)
$g.DrawLines($linePen, $linePts)

$barGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 70, 180, 255))
$barBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 95, 200, 255))
$wickPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(170, 95, 200, 255), 1)
$bars = @(
  @(384, 176, 7, 16, 170, 196), @(396, 166, 7, 26, 156, 197), @(408, 154, 8, 38, 144, 197),
  @(421, 138, 8, 54, 126, 198), @(434, 118, 9, 74, 102, 199), @(447, 92, 9, 100, 78, 199),
  @(460, 60, 10, 132, 48, 199)
)
foreach ($bar in $bars) {
  $g.FillRectangle($barGlow, $bar[0] - 3, $bar[1] - 4, $bar[2] + 6, $bar[3] + 8)
  $g.DrawLine($wickPen, $bar[0] + [int]($bar[2] / 2), $bar[4], $bar[0] + [int]($bar[2] / 2), $bar[5])
  $g.FillRectangle($barBrush, $bar[0], $bar[1], $bar[2], $bar[3])
}

$fontFamily = New-Object System.Drawing.FontFamily("Segoe UI Black")
$markPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$markPath.AddString("S", $fontFamily, [int][System.Drawing.FontStyle]::Bold, 178, ([System.Drawing.Point]::new(114, 8)), [System.Drawing.StringFormat]::GenericDefault)
$markGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(24, 80, 170, 255), 16)
$markPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(72, 85, 180, 255), 2)
$markFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(62, 70, 140, 255))
$g.DrawPath($markGlow, $markPath)
$g.FillPath($markFill, $markPath)
$g.DrawPath($markPen, $markPath)

$innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$innerPath.AddString("S", $fontFamily, [int][System.Drawing.FontStyle]::Bold, 62, ([System.Drawing.Point]::new(214, 68)), [System.Drawing.StringFormat]::GenericDefault)
$innerGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(44, 40, 175, 255), 8)
$innerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 55, 190, 255), 1.6)
$innerFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(96, 34, 145, 255))
$g.DrawPath($innerGlow, $innerPath)
$g.FillPath($innerFill, $innerPath)
$g.DrawPath($innerPen, $innerPath)

$arcPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(85, 110, 170, 255), 1.2)
$g.DrawArc($arcPen, 48, 2, 122, 122, 205, 82)

$overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(20, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(78, 0, 0, 0)), 0
$g.FillRectangle($overlayBrush, $rect)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath
