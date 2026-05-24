# Converts ar-business-guide-source.html to Word .docx (RTL Arabic)
$ErrorActionPreference = 'Stop'
$docsDir = Split-Path $PSScriptRoot -Parent
$htmlPath = Join-Path $docsDir 'ar-business-guide-source.html'
$docxPath = Join-Path $docsDir 'business-guide-ar.docx'

if (-not (Test-Path $htmlPath)) {
  throw "Missing source HTML: $htmlPath"
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open($htmlPath)
  $doc.Content.ParagraphFormat.ReadingOrder = 1
  $doc.Content.ParagraphFormat.Alignment = 2
  foreach ($tbl in $doc.Tables) {
    $tbl.Range.ParagraphFormat.ReadingOrder = 1
    $tbl.Range.ParagraphFormat.Alignment = 2
  }
  if (Test-Path $docxPath) { Remove-Item $docxPath -Force }
  $null = $doc.SaveAs2($docxPath, 16)
  $doc.Close($false)
  Write-Host "Created: $docxPath"
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
