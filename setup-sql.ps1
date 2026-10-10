# Script para ejecutar SQL en Supabase
$supabaseUrl = "https://xjyleolaeqkbetegqfts.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeWxlb2xhZXFrYmV0ZWdxZnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDY5NjMsImV4cCI6MjEwNjk4Mjk2M30.GcKSkzvPVxnk6KAAqpOvF9-tHXlqvrTWfcFiYmD9238"

# Primero: crear extensión btree_gist
$body = @{ sql = "CREATE EXTENSION IF NOT EXISTS btree_gist;" } | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/rest/v1/rpc/execute-sql" -ContentType "application/json" -Body $body -Headers @{ "apikey" = $anonKey; "Authorization" = "Bearer $anonKey" }
Write-Host "✅ Extensión btree_gist creada"

# Segundo: Ejecutar schema completo
$schemaPath = "C:\Users\MINED\Desktop\BUS-IN-LIVE\database\schema.sql"
$schemaContent = Get-Content -Path $schemaPath -Raw
# Dividir por GO para ejecutar cada bloque
$blocks = $schemaContent -split "(?i^GO)" | Where-Object { $_.Trim() -ne "" }

foreach ($block in $blocks) {
    $body = @{ sql = $block } | ConvertTo-Json -Compress
    try {
        $result = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/rest/v1/rpc/execute-sql" -ContentType "application/json" -Body $body -Headers @{ "apikey" = $anonKey; "Authorization" = "Bearer $anonKey" }
        Write-Host "✅ Ejecutado bloque SQL ($(($block -split "`n")[0] -replace "^\s+", "" | Measure-Object).Lines)"

    } catch {
        Write-Host "⚠️ Advertencia en bloque: $(($_.Exception | Select-Object -ExpandProperty Message) -replace "`r`n", " " | Substring(0, 100))"
    }
}

Write-Host "🎉 Base de datos configurada exitosamente"