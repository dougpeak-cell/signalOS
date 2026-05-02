Add-Type -AssemblyName System.Drawing

$random = [System.Random]::new(23)
$outDir = "C:\Users\dougp\Projects\Signalos\signalos\signalos-elite\public\backgrounds"
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$outPath = Join-Path $outDir "bull-flow.png"
$width = 480
$height = 270
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 2, 18, 8)), ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), 90
$g.FillRectangle($bgBrush, $rect)

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(18, 70, 220, 100), 1)
for ($x = 0; $x -lt $width; $x += 22) {
  $g.DrawLine($gridPen, $x, 0, $x, $height)
}
for ($y = 0; $y -lt $height; $y += 22) {
  $g.DrawLine($gridPen, 0, $y, $width, $y)
}

$dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 90, 255, 140))
for ($i = 0; $i -lt 230; $i++) {
  $x = $random.Next(0, $width)
  $y = $random.Next(0, $height)
  $size = $random.Next(1, 3)
  $g.FillEllipse($dotBrush, $x, $y, $size, $size)
}

$topTrend = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(128, 70, 255, 120), 1.2)
$topPoints = @(
  [System.Drawing.PointF]::new(18, 126), [System.Drawing.PointF]::new(64, 138), [System.Drawing.PointF]::new(96, 94),
  [System.Drawing.PointF]::new(128, 112), [System.Drawing.PointF]::new(168, 84), [System.Drawing.PointF]::new(208, 116),
  [System.Drawing.PointF]::new(246, 108), [System.Drawing.PointF]::new(286, 72), [System.Drawing.PointF]::new(330, 40),
  [System.Drawing.PointF]::new(382, 22), [System.Drawing.PointF]::new(452, 14)
)
$g.DrawLines($topTrend, $topPoints)

$wirePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(22, 70, 180, 90), 1)
for ($x = -140; $x -lt $width + 100; $x += 20) {
  $g.DrawLine($wirePen, $x, $height, $x + 140, [int]($height * 0.64))
}
for ($y = 0; $y -lt 10; $y++) {
  $curve = New-Object System.Drawing.Drawing2D.GraphicsPath
  $baseY = [int]($height * 0.65 + $y * 14)
  $curve.AddBezier(0, $baseY, 150, $baseY - 10, 300, $baseY + 20, $width, $baseY - 2)
  $g.DrawPath($wirePen, $curve)
  $curve.Dispose()
}

$waveGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(34, 30, 255, 80), 20)
$waveMid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(82, 30, 255, 95), 10)
$wavePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(240, 90, 255, 140), 2.8)
$wave = New-Object System.Drawing.Drawing2D.GraphicsPath
$wave.AddBezier(-20, 192, 96, 154, 220, 236, 352, 164)
$wave.AddBezier(352, 164, 392, 142, 430, 118, 500, 64)
$g.DrawPath($waveGlow, $wave)
$g.DrawPath($waveMid, $wave)
$g.DrawPath($wavePen, $wave)

$wickPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 100, 255, 145), 1)
$candleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 95, 255, 135))
$candleGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 95, 255, 135))
$candles = @(
  @(92, 174, 7, 10, 168, 190), @(106, 168, 7, 16, 160, 186), @(120, 160, 7, 23, 154, 186),
  @(136, 154, 7, 28, 148, 188), @(152, 146, 8, 35, 140, 186), @(172, 140, 8, 42, 134, 184),
  @(192, 128, 8, 54, 120, 184), @(214, 118, 8, 64, 108, 184), @(238, 108, 9, 74, 100, 188),
  @(262, 96, 9, 86, 88, 190), @(286, 88, 10, 98, 80, 190), @(312, 79, 10, 106, 72, 190),
  @(338, 68, 11, 118, 58, 189), @(366, 56, 11, 130, 46, 188), @(396, 42, 12, 144, 32, 188),
  @(426, 26, 12, 158, 18, 186), @(454, 14, 12, 170, 8, 184)
)
foreach ($c in $candles) {
  $x = $c[0]
  $y = $c[1]
  $w = $c[2]
  $h = $c[3]
  $wickTop = $c[4]
  $wickBottom = $c[5]
  $g.FillRectangle($candleGlow, $x - 2, $y - 3, $w + 4, $h + 6)
  $g.DrawLine($wickPen, $x + [int]($w / 2), $wickTop, $x + [int]($w / 2), $wickBottom)
  $g.FillRectangle($candleBrush, $x, $y, $w, $h)
}

$volumeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(68, 90, 255, 135))
$volumeBars = @(
  @(246, 224, 8, 32), @(259, 216, 8, 40), @(273, 228, 8, 28), @(287, 206, 8, 50),
  @(301, 214, 8, 42), @(315, 196, 8, 60), @(329, 210, 8, 46), @(343, 188, 8, 68),
  @(357, 204, 8, 52), @(371, 180, 8, 76), @(385, 194, 8, 62), @(399, 166, 8, 90),
  @(413, 178, 8, 78), @(427, 150, 8, 106)
)
foreach ($bar in $volumeBars) {
  $g.FillRectangle($volumeBrush, $bar[0], $bar[1], $bar[2], $bar[3])
}

$bullFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 120, 255, 160))
$bullGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(26, 110, 255, 150), 8)
$bullPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160, 110, 255, 150), 1.4)
$bull = New-Object System.Drawing.Drawing2D.GraphicsPath
$bull.StartFigure()
$bull.AddBezier(364, 206, 372, 166, 398, 142, 424, 142)
$bull.AddBezier(424, 142, 442, 142, 456, 152, 456, 172)
$bull.AddLine(456, 172, 464, 188)
$bull.AddLine(464, 188, 448, 186)
$bull.AddBezier(448, 186, 432, 182, 424, 174, 420, 164)
$bull.AddBezier(420, 164, 410, 170, 402, 177, 390, 184)
$bull.AddBezier(390, 184, 380, 190, 370, 198, 364, 206)
$g.FillPath($bullFill, $bull)
$g.DrawPath($bullGlow, $bull)
$g.DrawPath($bullPen, $bull)
$g.DrawArc($bullPen, 416, 126, 26, 22, 184, 168)
$g.DrawArc($bullPen, 438, 128, 24, 18, 194, 156)
$g.DrawLine($bullPen, 382, 184, 374, 212)
$g.DrawLine($bullPen, 438, 184, 432, 210)

$overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(36, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(84, 0, 0, 0)), 0
$g.FillRectangle($overlayBrush, $rect)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath
