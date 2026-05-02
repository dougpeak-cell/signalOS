Add-Type -AssemblyName System.Drawing

$random = [System.Random]::new(17)
$outDir = "C:\Users\dougp\Projects\Signalos\signalos\signalos-elite\public\backgrounds"
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$outPath = Join-Path $outDir "bear-pressure.png"
$width = 480
$height = 270
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 26, 2, 4)), ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), 90
$g.FillRectangle($bgBrush, $rect)

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(18, 180, 40, 40), 1)
for ($x = 0; $x -lt $width; $x += 22) {
  $g.DrawLine($gridPen, $x, 0, $x, $height)
}
for ($y = 0; $y -lt $height; $y += 22) {
  $g.DrawLine($gridPen, 0, $y, $width, $y)
}

$dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 255, 70, 70))
for ($i = 0; $i -lt 220; $i++) {
  $x = $random.Next(0, $width)
  $y = $random.Next(0, $height)
  $size = $random.Next(1, 3)
  $g.FillEllipse($dotBrush, $x, $y, $size, $size)
}

$trendPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150, 255, 55, 55), 1.2)
$trendPoints = @(
  [System.Drawing.PointF]::new(6, 18), [System.Drawing.PointF]::new(44, 42), [System.Drawing.PointF]::new(84, 66),
  [System.Drawing.PointF]::new(116, 90), [System.Drawing.PointF]::new(150, 112), [System.Drawing.PointF]::new(184, 136),
  [System.Drawing.PointF]::new(220, 160), [System.Drawing.PointF]::new(258, 182), [System.Drawing.PointF]::new(298, 204),
  [System.Drawing.PointF]::new(344, 226), [System.Drawing.PointF]::new(430, 252)
)
$g.DrawLines($trendPen, $trendPoints)

$faintPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(68, 180, 40, 40), 1)
$faintPoints = @(
  [System.Drawing.PointF]::new(310, 50), [System.Drawing.PointF]::new(346, 70), [System.Drawing.PointF]::new(388, 88), [System.Drawing.PointF]::new(430, 92), [System.Drawing.PointF]::new(470, 82)
)
$g.DrawLines($faintPen, $faintPoints)

$wirePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(30, 160, 35, 35), 1)
for ($x = -140; $x -lt $width + 100; $x += 20) {
  $g.DrawLine($wirePen, $x, $height, $x + 140, [int]($height * 0.62))
}
for ($y = 0; $y -lt 10; $y++) {
  $curve = New-Object System.Drawing.Drawing2D.GraphicsPath
  $baseY = [int]($height * 0.64 + $y * 13)
  $curve.AddBezier(0, $baseY, 150, $baseY - 10, 300, $baseY + 24, $width, $baseY + 2)
  $g.DrawPath($wirePen, $curve)
  $curve.Dispose()
}

$waveGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(34, 255, 35, 35), 20)
$waveMid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 255, 55, 55), 10)
$wavePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(240, 255, 105, 105), 2.8)
$wave = New-Object System.Drawing.Drawing2D.GraphicsPath
$wave.AddBezier(-20, 192, 80, 150, 220, 246, 350, 186)
$wave.AddBezier(350, 186, 402, 160, 442, 140, 498, 114)
$g.DrawPath($waveGlow, $wave)
$g.DrawPath($waveMid, $wave)
$g.DrawPath($wavePen, $wave)

$wickPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 255, 115, 115), 1)
$candleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 85, 85))
$candleGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 255, 85, 85))
$candles = @(
  @(0, 10, 11, 24, 6, 38), @(18, 24, 10, 20, 20, 54), @(36, 40, 10, 20, 34, 68),
  @(54, 52, 10, 18, 48, 78), @(72, 66, 10, 18, 61, 92), @(90, 80, 10, 18, 76, 106),
  @(108, 92, 10, 17, 88, 118), @(126, 104, 10, 17, 100, 130), @(144, 116, 10, 17, 112, 142),
  @(162, 129, 10, 16, 124, 155), @(180, 141, 10, 16, 136, 167), @(198, 154, 10, 15, 148, 178),
  @(216, 166, 10, 15, 160, 190), @(234, 178, 10, 15, 172, 202), @(252, 190, 10, 15, 184, 214),
  @(270, 200, 10, 15, 194, 224), @(288, 210, 10, 15, 204, 236), @(306, 218, 10, 16, 212, 245)
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

$volumeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(68, 170, 50, 50))
$volumeBars = @(
  @(350, 214, 8, 38), @(364, 202, 8, 50), @(378, 194, 8, 58), @(392, 201, 8, 51),
  @(406, 185, 8, 67), @(420, 173, 8, 79), @(434, 190, 8, 62), @(448, 160, 8, 92), @(462, 176, 8, 76)
)
foreach ($bar in $volumeBars) {
  $g.FillRectangle($volumeBrush, $bar[0], $bar[1], $bar[2], $bar[3])
}

$bearFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 255, 95, 95))
$bearGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(24, 255, 95, 95), 8)
$bearPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150, 255, 95, 95), 1.3)
$bear = New-Object System.Drawing.Drawing2D.GraphicsPath
$bear.StartFigure()
$bear.AddBezier(286, 118, 314, 84, 366, 70, 408, 78)
$bear.AddBezier(408, 78, 438, 84, 460, 100, 466, 122)
$bear.AddBezier(466, 122, 454, 128, 442, 134, 430, 140)
$bear.AddBezier(430, 140, 418, 158, 406, 176, 394, 194)
$bear.AddBezier(394, 194, 384, 206, 370, 214, 354, 216)
$bear.AddBezier(354, 216, 340, 216, 328, 210, 318, 198)
$bear.AddBezier(318, 198, 308, 184, 300, 174, 288, 172)
$bear.AddBezier(288, 172, 276, 170, 266, 176, 258, 188)
$g.FillPath($bearFill, $bear)
$g.DrawPath($bearGlow, $bear)
$g.DrawPath($bearPen, $bear)
$g.DrawArc($bearPen, 326, 74, 17, 17, 180, 170)
$g.DrawArc($bearPen, 347, 66, 16, 16, 180, 170)
$g.DrawLine($bearPen, 310, 172, 300, 206)
$g.DrawLine($bearPen, 368, 194, 358, 226)
$g.DrawLine($bearPen, 412, 150, 404, 182)

$overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(40, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(94, 0, 0, 0)), 0
$g.FillRectangle($overlayBrush, $rect)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath
