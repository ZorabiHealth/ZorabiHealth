param(
  [Parameter(Mandatory=$true)]
  [string]$JsonPath
)

# Read the Firebase service account JSON
$json = Get-Content -Path $JsonPath -Raw

# Output as single line for .env.local
$singleLine = $json -replace "`r`n", " " -replace "`n", " " -replace "`r", " "
Write-Output "FIREBASE_SERVICE_ACCOUNT_KEY=$singleLine"
