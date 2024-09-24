$FileName = "dist"
if (Test-Path $FileName) {
  Remove-Item -Force -Recurse $FileName
}