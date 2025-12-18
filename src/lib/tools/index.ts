/**
 * Tools Index
 * Import all tools to register them
 */

import './pencil';
import './eraser';
import './bucket';
import './picker';
import './wand';
import './colorRange';
import './selection';
import './lasso';
import './polygon';
import './magnetic';
import './clone';
import './smudge';
import './blur';
import './sharpen';
import './gradient';
import './move';

// New professional-grade tools
import './rotate';
import './scale';
import './crop';
import './intelligent-scissors';
import './heal';
import './paths';

// Cleanup tools
import './cleanup-stray-pixels';
import './cleanup-color-reduce';
import './cleanup-edge-crisp';
import './cleanup-edge-smooth';
import './cleanup-line-normalize';
import './cleanup-outline';
import './cleanup-logo';
import './cleanup-inspector';

// Stabilizer and GapCloser are utility modules, not tools
export { createStabilizer } from './stabilizer';
export { createGapCloser } from './gapCloser';
