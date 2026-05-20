/**
 * CONFIGURAÇÕES DO JOGO
 * 
 * Arquivo centralizado para ajustar parâmetros do jogo
 */

export const GAME_CONFIG = {
  // Número máximo de jogadores permitidos
  MAX_PLAYERS: 9,
  
  // Tempo em milissegundos para mostrar a resposta correta antes de avançar
  CORRECT_ANSWER_DISPLAY_TIME: 3000,
  
  // Número de dicas por carta
  CLUES_PER_CARD: 10,
  
  // Porta do servidor
  SERVER_PORT: 3000,
  
  // URL do servidor (altere se necessário para rede local)
  SERVER_URL: 'http://localhost:3000',
};

/**
 * Para jogar em rede local (múltiplos dispositivos):
 * 
 * 1. Descubra seu IP local:
 *    - Windows: ipconfig (procure IPv4)
 *    - Mac/Linux: ifconfig ou ip addr
 * 
 * 2. Altere SERVER_URL acima para:
 *    SERVER_URL: 'http://SEU_IP:3000'
 *    Exemplo: 'http://192.168.1.100:3000'
 * 
 * 3. Compartilhe esse endereço com outros jogadores
 */
