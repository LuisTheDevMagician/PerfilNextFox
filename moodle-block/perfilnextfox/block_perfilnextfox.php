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
        $this->content->text = '
<style>
#pfx-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 99999;
    background: #07070E;
}
#pfx-overlay iframe {
    width: 100%; height: 100%;
    border: none;
}
#pfx-close {
    position: absolute;
    top: 12px; right: 16px;
    z-index: 100000;
    background: rgba(239,68,68,0.85);
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
}
#pfx-close:hover { background: rgba(239,68,68,1); }
#pfx-launch {
    display: block;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #7C3AED, #EC4899);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: bold;
    cursor: pointer;
    text-align: center;
    letter-spacing: 0.03em;
}
#pfx-launch:hover { filter: brightness(1.1); }
</style>

<button id="pfx-launch" onclick="document.getElementById(\'pfx-overlay\').style.display=\'block\'">
    &#9654; Iniciar PerfilNextFox
</button>

<div id="pfx-overlay">
    <button id="pfx-close" onclick="document.getElementById(\'pfx-overlay\').style.display=\'none\'">
        &#x2715; Fechar
    </button>
    <iframe src="' . $gameurl . '" allow="autoplay"></iframe>
</div>
';
        $this->content->footer = '';

        return $this->content;
    }

    public function applicable_formats() {
        return ['all' => true];
    }
}
