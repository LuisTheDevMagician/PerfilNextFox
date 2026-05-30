<?php
// Os avisos de "$plugin undefined" e "MATURITY_STABLE undefined" são falsos positivos do IDE.
// O Moodle injeta $plugin e define MATURITY_STABLE antes de incluir este arquivo em tempo de execução.
defined('MOODLE_INTERNAL') || die();

$plugin->version   = 2026053000;
$plugin->requires  = 2022041900; // Moodle 4.0
$plugin->component = 'block_perfilnextfox';
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0.0';
