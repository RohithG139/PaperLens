import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Quote, Heart, CheckSquare, Square, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const styles = {
  card: (selected) => ({
    backgroundColor: '#161B22',
    border: `1px solid ${selected ? '#58A6FF' : '#30363D'}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'default',
    position: 'relative',
    transition: 'border-color 0.2s ease',
  }),
  selectedStrip: {
    height: '4px',
    backgroundColor: '#58A6FF',
    width: '100%',
  },
  body: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  yearBadge: {
    backgroundColor: '#21262D',
    color: '#8B949E',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '20px',
    border: '1px solid #30363D',
    whiteSpace: 'nowrap',
  },
  citationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#161B22',
    color: '#8B949E',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '20px',
    border: '1px solid #30363D',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  title: {
    color: '#E6EDF3',
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  },
  authors: {
    color: '#8B949E',
    fontSize: '13px',
    fontStyle: 'italic',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  scoreLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#8B949E',
  },
  scoreBar: {
    height: '6px',
    backgroundColor: '#21262D',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  scoreFill: (score) => ({
    height: '100%',
    width: `${Math.round(score * 100)}%`,
    backgroundColor: score >= 0.7 ? '#3FB950' : score >= 0.4 ? '#D29922' : '#F85149',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  }),
  abstractContainer: {
    position: 'relative',
  },
  abstract: (expanded) => ({
    color: '#8B949E',
    fontSize: '13px',
    lineHeight: '1.55',
    margin: 0,
    display: expanded ? 'block' : '-webkit-box',
    WebkitLineClamp: expanded ? 'unset' : 3,
    WebkitBoxOrient: expanded ? 'unset' : 'vertical',
    overflow: expanded ? 'visible' : 'hidden',
  }),
  expandBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#58A6FF',
    fontSize: '12px',
    padding: '2px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    marginTop: '4px',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    backgroundColor: '#21262D',
    color: '#79C0FF',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '20px',
    border: '1px solid #30363D',
  },
  footer: {
    borderTop: '1px solid #21262D',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#21262D',
    color: '#58A6FF',
    border: '1px solid #30363D',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
};

export default function PaperCard({ paper, selected = false, onSelect, onSave, showSelect = true }) {
  const navigate = useNavigate();
  const [abstractExpanded, setAbstractExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const authors = paper.authors || [];
  const displayAuthors = authors.length > 3
    ? authors.slice(0, 3).join(', ') + ' et al.'
    : authors.join(', ');

  const fields = paper.fieldsOfStudy || paper.fields_of_study || [];

  return (
    <motion.div
      style={styles.card(selected)}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
      transition={{ duration: 0.18 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {selected && <div style={styles.selectedStrip} />}

      <div style={styles.body}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {paper.year && (
              <span style={styles.yearBadge}>{paper.year}</span>
            )}
            {paper.citationCount != null && (
              <span style={styles.citationBadge}>
                <Quote size={11} />
                {paper.citationCount.toLocaleString()}
              </span>
            )}
          </div>
          <div style={styles.headerRight}>
            {showSelect && (
              <button
                style={styles.iconBtn}
                title={selected ? 'Deselect' : 'Select for comparison'}
                onClick={() => onSelect && onSelect(paper)}
              >
                {selected
                  ? <CheckSquare size={18} color="#58A6FF" />
                  : <Square size={18} color="#8B949E" />
                }
              </button>
            )}
            <button
              style={styles.iconBtn}
              title="Save paper"
              onClick={() => onSave && onSave(paper)}
            >
              <Heart
                size={18}
                color={paper.saved ? '#F85149' : '#8B949E'}
                fill={paper.saved ? '#F85149' : 'none'}
              />
            </button>
          </div>
        </div>

        <p style={styles.title}>{paper.title}</p>

        {displayAuthors && (
          <p style={styles.authors}>{displayAuthors}</p>
        )}

        {paper.relevance_score != null && (
          <div style={styles.scoreContainer}>
            <div style={styles.scoreLabel}>
              <span>Relevance</span>
              <span>{Math.round(paper.relevance_score * 100)}%</span>
            </div>
            <div style={styles.scoreBar}>
              <div style={styles.scoreFill(paper.relevance_score)} />
            </div>
          </div>
        )}

        {paper.abstract && (
          <div style={styles.abstractContainer}>
            <p style={styles.abstract(abstractExpanded)}>{paper.abstract}</p>
            <button
              style={styles.expandBtn}
              onClick={() => setAbstractExpanded(!abstractExpanded)}
            >
              {abstractExpanded
                ? <><ChevronUp size={12} /> Show less</>
                : <><ChevronDown size={12} /> Show more</>
              }
            </button>
          </div>
        )}

        {fields.length > 0 && (
          <div style={styles.tagsContainer}>
            {fields.map((f, i) => (
              <span key={i} style={styles.tag}>{f}</span>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button
          style={{
            ...styles.viewBtn,
            ...(hovered ? { backgroundColor: '#2D333B', borderColor: '#58A6FF' } : {}),
          }}
          onClick={() => navigate(`/papers/${paper.paperId || paper.paper_id || paper.id}`)}
        >
          View Details
          <ExternalLink size={13} />
        </button>
      </div>
    </motion.div>
  );
}
