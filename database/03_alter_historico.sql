ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS tipo_operacao VARCHAR(30) DEFAULT 'MANUTENCAO';

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS mensagem TEXT;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS banco_dados VARCHAR(100);