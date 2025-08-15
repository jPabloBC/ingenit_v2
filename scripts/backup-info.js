#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 INFORMACIÓN DE BACKUPS Y COMMITS\n');

try {
    // Obtener información del último commit
    const lastCommit = execSync('git log -1 --pretty=format:"%h - %an - %ad - %s" --date=format:"%Y-%m-%d %H:%M:%S"', { encoding: 'utf8' }).trim();
    
    // Obtener total de commits
    const totalCommits = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    
    // Obtener commits de la última semana
    const weeklyCommits = execSync('git log --oneline --since="1 week ago" | wc -l', { encoding: 'utf8' }).trim();
    
    // Obtener commits del último mes
    const monthlyCommits = execSync('git log --oneline --since="1 month ago" | wc -l', { encoding: 'utf8' }).trim();
    
    // Obtener fecha del primer commit
    const firstCommit = execSync('git log --reverse --pretty=format:"%ad" --date=format:"%Y-%m-%d" | head -1', { encoding: 'utf8' }).trim();
    
    // Obtener commits recientes (últimos 10)
    const recentCommits = execSync('git log --pretty=format:"%h - %ad - %s" --date=format:"%m/%d %H:%M" -10', { encoding: 'utf8' }).trim();
    
    // Verificar si hay cambios sin commitear
    const hasUncommittedChanges = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    
    console.log('🔄 ÚLTIMO COMMIT (BACKUP):');
    console.log(`   ${lastCommit}\n`);
    
    console.log('📈 ESTADÍSTICAS:');
    console.log(`   • Total de commits: ${totalCommits}`);
    console.log(`   • Commits esta semana: ${weeklyCommits}`);
    console.log(`   • Commits este mes: ${monthlyCommits}`);
    console.log(`   • Primer commit: ${firstCommit}`);
    console.log(`   • Cambios sin commitear: ${hasUncommittedChanges ? 'SÍ ⚠️' : 'NO ✅'}\n`);
    
    console.log('📝 COMMITS RECIENTES (ÚLTIMOS 10):');
    const commits = recentCommits.split('\n');
    commits.forEach((commit, index) => {
        console.log(`   ${index + 1}. ${commit}`);
    });
    
    console.log('\n🔍 BUSCAR BACKUPS ESPECÍFICOS:');
    console.log('   Para buscar commits con "backup" en el mensaje:');
    console.log('   git log --grep="backup" --oneline');
    console.log('\n   Para ver commits de una fecha específica:');
    console.log('   git log --since="2025-08-01" --oneline');
    console.log('\n   Para ver commits de un autor específico:');
    console.log('   git log --author="Juan Pablo" --oneline');
    
    console.log('\n💾 COMANDOS ÚTILES:');
    console.log('   • Crear backup manual: npm run backup');
    console.log('   • Verificar archivos críticos: npm run verify');
    console.log('   • Ver cambios actuales: git status');
    console.log('   • Ver diferencias: git diff');
    console.log('   • Restaurar todo: git restore .');
    
    if (hasUncommittedChanges) {
        console.log('\n⚠️  ADVERTENCIA:');
        console.log('   Tienes cambios sin commitear. Recomendamos hacer backup:');
        console.log('   npm run backup');
    }
    
} catch (error) {
    console.error('❌ Error obteniendo información de backups:', error.message);
}
