<?php
defined('MOODLE_INTERNAL') || die();

class block_perfilnextfox extends block_base {

    public function init() {
        $this->title = get_string('pluginname', 'block_perfilnextfox');
    }

    public function get_content() {
        if ($this->content !== null) {
            return $this->content;
        }

        $gameurl = 'http://localhost:3000';

        $this->content = new stdClass();
        $this->content->text = html_writer::tag('iframe', '', [
            'src'         => $gameurl,
            'width'       => '100%',
            'height'      => '700',
            'frameborder' => '0',
            'allow'       => 'autoplay',
            'style'       => 'border-radius:8px; display:block;',
        ]);
        $this->content->footer = '';

        return $this->content;
    }

    public function applicable_formats() {
        return ['all' => true];
    }
}
