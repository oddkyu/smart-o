-- Grammar Tree Nodes Table
CREATE TABLE public.grammar_tree_nodes (
    node_id VARCHAR(50) PRIMARY KEY,
    parent_id VARCHAR(50) REFERENCES public.grammar_tree_nodes(node_id) ON DELETE CASCADE,
    node_name TEXT NOT NULL,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update incorrect_notes to link to grammar_tree_nodes
ALTER TABLE public.incorrect_notes
ADD COLUMN grammar_node_id VARCHAR(50) REFERENCES public.grammar_tree_nodes(node_id) ON DELETE SET NULL;

-- Insert Initial Grammar Tree Data (3-depth structure)
INSERT INTO public.grammar_tree_nodes (node_id, parent_id, node_name, level) VALUES
('ROOT', NULL, '토익 문법 (TOEIC Grammar)', 0),

-- Level 1
('VERB', 'ROOT', '동사 (Verb)', 1),
('MODIFIER', 'ROOT', '수식어 (Modifier)', 1),
('CONNECTOR', 'ROOT', '연결어 (Connector)', 1),
('NOUN_PRONOUN', 'ROOT', '명사/대명사 (Noun & Pronoun)', 1),

-- Level 2 (VERB)
('VERB_TENSE', 'VERB', '시제 (Tense)', 2),
('VERB_AGREEMENT', 'VERB', '수일치 (Agreement)', 2),
('VERB_VOICE', 'VERB', '태 (Voice)', 2),

-- Level 2 (MODIFIER)
('ADJ_ADV', 'MODIFIER', '형용사/부사 (Adj/Adv)', 2),
('RELATIVE_CLAUSE', 'MODIFIER', '관계사 (Relative Clause)', 2),
('PARTICIPLE', 'MODIFIER', '분사 (Participle)', 2),

-- Level 2 (CONNECTOR)
('PREPOSITION', 'CONNECTOR', '전치사 (Preposition)', 2),
('CONJUNCTION', 'CONNECTOR', '접속사 (Conjunction)', 2);
