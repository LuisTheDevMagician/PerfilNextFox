#!/bin/bash
set -e

CONFIG="/var/www/html/config.php"
DB_HOST="${MOODLE_DB_HOST:-mariadb}"
DB_USER="${MOODLE_DB_USER:-moodle}"
DB_PASS="${MOODLE_DB_PASS:-moodle}"
DB_NAME="${MOODLE_DB_NAME:-moodle}"
WWWROOT="${MOODLE_WWWROOT:-http://localhost:8080}"

# Aguarda o banco aceitar conexões
until php -r "
    \$c = new mysqli('$DB_HOST', '$DB_USER', '$DB_PASS', '$DB_NAME');
    if (\$c->connect_error) exit(1);
    exit(0);
" 2>/dev/null; do
    echo "==> Aguardando banco de dados..."
    sleep 3
done

# Verifica se as tabelas do Moodle já existem no banco
TABLES=$(php -r "
    \$c = new mysqli('$DB_HOST', '$DB_USER', '$DB_PASS', '$DB_NAME');
    \$r = \$c->query('SHOW TABLES LIKE \"mdl_config\"');
    echo \$r ? \$r->num_rows : 0;
" 2>/dev/null || echo "0")

if [ "$TABLES" = "0" ]; then
    # Banco vazio — instalação completa
    echo "==> Primeira execução: instalando Moodle via CLI..."

    php /var/www/html/admin/cli/install.php \
        --lang=pt_br \
        --wwwroot="$WWWROOT" \
        --dataroot=/var/moodledata \
        --dbtype=mariadb \
        --dbhost="$DB_HOST" \
        --dbname="$DB_NAME" \
        --dbuser="$DB_USER" \
        --dbpass="$DB_PASS" \
        --fullname="${MOODLE_FULLNAME:-PerfilNextFox AVA}" \
        --shortname="${MOODLE_SHORTNAME:-PNF}" \
        --adminuser="${MOODLE_ADMIN_USER:-admin}" \
        --adminpass="${MOODLE_ADMIN_PASS:-admin123}" \
        --adminemail="admin@example.com" \
        --non-interactive \
        --agree-license

    echo "==> Moodle instalado com sucesso!"

elif [ ! -f "$CONFIG" ]; then
    # Banco já tem tabelas mas config.php sumiu (container recriado sem -v)
    # Regenera config.php sem rodar o installer novamente
    echo "==> Banco já instalado — regenerando config.php..."

    cat > "$CONFIG" << MOODLECONFIG
<?php  // Moodle configuration file
unset(\$CFG);
global \$CFG;
\$CFG = new stdClass();
\$CFG->dbtype    = 'mariadb';
\$CFG->dblibrary = 'native';
\$CFG->dbhost    = '$DB_HOST';
\$CFG->dbname    = '$DB_NAME';
\$CFG->dbuser    = '$DB_USER';
\$CFG->dbpass    = '$DB_PASS';
\$CFG->prefix    = 'mdl_';
\$CFG->dboptions = array(
    'dbpersist' => 0,
    'dbport'    => 3306,
    'dbsocket'  => '',
    'dbcollation' => 'utf8mb4_unicode_ci',
);
\$CFG->wwwroot   = '$WWWROOT';
\$CFG->dataroot  = '/var/moodledata';
\$CFG->admin     = 'admin';
\$CFG->directorypermissions = 0777;
require_once(__DIR__ . '/lib/setup.php');
MOODLECONFIG

    chown www-data:www-data "$CONFIG"
    echo "==> config.php regenerado com sucesso!"
fi

exec "$@"
