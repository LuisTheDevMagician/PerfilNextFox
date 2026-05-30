#!/bin/bash
set -e

CONFIG="/var/www/html/config.php"

if [ ! -f "$CONFIG" ]; then
    echo "==> Primeira execução: instalando Moodle via CLI..."

    # Aguarda o banco de dados aceitar conexões
    until php -r "
        \$conn = new mysqli(
            '${MOODLE_DB_HOST:-mariadb}',
            '${MOODLE_DB_USER:-moodle}',
            '${MOODLE_DB_PASS:-moodle}',
            '${MOODLE_DB_NAME:-moodle}'
        );
        if (\$conn->connect_error) exit(1);
        exit(0);
    " 2>/dev/null; do
        echo "==> Aguardando banco de dados..."
        sleep 3
    done

    php /var/www/html/admin/cli/install.php \
        --lang=pt_br \
        --wwwroot="${MOODLE_WWWROOT:-http://localhost:8080}" \
        --dataroot=/var/moodledata \
        --dbtype=mariadb \
        --dbhost="${MOODLE_DB_HOST:-mariadb}" \
        --dbname="${MOODLE_DB_NAME:-moodle}" \
        --dbuser="${MOODLE_DB_USER:-moodle}" \
        --dbpass="${MOODLE_DB_PASS:-moodle}" \
        --fullname="${MOODLE_FULLNAME:-PerfilNextFox AVA}" \
        --shortname="${MOODLE_SHORTNAME:-PNF}" \
        --adminuser="${MOODLE_ADMIN_USER:-admin}" \
        --adminpass="${MOODLE_ADMIN_PASS:-admin123}" \
        --adminemail="admin@example.com" \
        --non-interactive \
        --agree-license

    echo "==> Moodle instalado com sucesso!"
fi

exec "$@"
