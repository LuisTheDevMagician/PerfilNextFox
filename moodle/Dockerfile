FROM moodlehq/moodle-php-apache:8.2

ENV APACHE_DOCUMENT_ROOT=/var/www/html

# Baixa Moodle 4.5.2 do GitHub oficial
RUN curl -fsSL https://github.com/moodle/moodle/archive/refs/tags/v4.5.2.tar.gz \
    | tar xz --strip-components=1 -C /var/www/html \
    && mkdir -p /var/moodledata \
    && chown -R www-data:www-data /var/www/html /var/moodledata \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/moodledata

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2-foreground"]
