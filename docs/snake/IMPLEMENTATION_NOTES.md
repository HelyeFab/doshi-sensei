# Snake Path Implementation Notes

## Development Journey

### Initial Concept
The user requested a Duolingo-style snake path for the practice page, showing a winding progression path with circular nodes.

### Key Development Decisions

#### 1. Path Line Removal
- Initially implemented with SVG bezier curves connecting nodes
- User preferred cleaner look without connecting lines
- Path is now implied through node positioning alone

#### 2. Position Discovery Tool
- Created `AdjustableSnakePath` with sliders
- Allows visual positioning without code changes
- Exports production-ready position arrays
- Kept in codebase for future path adjustments

#### 3. Background Animation
- Added infinite scrolling cards from mood board design
- Purple frosted glass overlay for depth
- Creates dynamic, engaging backdrop
- Maintains 12% opacity for subtlety

#### 4. Node Design Evolution
- Started with simple circles
- Added gradient backgrounds
- Implemented pulsing ripple animations
- Hover effects with floating labels

### Technical Challenges Solved

#### 1. SVG Path Percentage Issue
**Problem**: SVG paths don't accept percentage values in `d` attribute
**Solution**: Removed SVG paths entirely, using absolute positioning instead

#### 2. Responsive Positioning
**Problem**: Node positions needed to work on all screen sizes
**Solution**: Use percentage-based X positioning with fixed Y values

#### 3. Animation Performance
**Problem**: Multiple animations could impact performance
**Solution**: 
- Use CSS transforms only
- Stagger animation delays
- Implement will-change for smooth animations

#### 4. Page Duplication
**Problem**: Multiple nodes linked to same pages
**Solution**: Consolidated to single node per unique page

### Architectural Decisions

#### Component Separation
Created multiple components for different use cases:
- **Production**: Fixed positions, no adjustments
- **Adjustable**: Development tool with sliders
- **Simple**: CSS Grid alternative approach
- **Advanced**: SVG-based with path drawing

#### State Management
- Node state (completed, current, locked) managed through props
- No global state required
- Progress tracked at parent component level

#### Routing Strategy
- Direct navigation using Next.js router
- href property on nodes for flexibility
- Fallback to onNodeClick handler

### Animation System

#### CSS Keyframes Created
1. **pulse-ring**: Expanding ring effect
2. **nodePulse**: Scale and shadow pulse
3. **nodeFloat**: Hover float effect
4. **pathDraw**: SVG path animation (kept for reference)

#### Animation Timing
- Nodes appear with 80ms stagger
- Spring animations for natural feel
- 2.5s cycle for pulse effects

### Color System

#### Node States
- **Completed**: Green gradient (#10b981 → #059669)
- **Available**: Purple gradient (#a855f7 → #9333ea)
- **Checkpoint**: Yellow gradient (#fbbf24 → #f59e0b)
- **Locked**: Gray (#d1d5db)
- **Current**: Purple border (#a855f7)

#### Ripple Colors
Match node state for visual consistency:
- Yellow ripples for checkpoints
- Green ripples for completed
- Purple ripples for available

### Mobile Considerations

#### Touch Targets
- Minimum 48px touch targets
- Larger hit areas than visual size
- Proper spacing between nodes

#### Responsive Sizing
- Desktop: 64px nodes, 80px checkpoints
- Mobile: 48px nodes, 60px checkpoints
- Maintained visual hierarchy

### Performance Optimizations

#### Animation Efficiency
- Transform-only animations
- GPU-accelerated properties
- Reduced motion support planned

#### Loading Strategy
- All nodes render immediately
- No lazy loading needed for 15 nodes
- Background animation uses CSS only

### Accessibility Considerations

#### Current Implementation
- Semantic button elements
- Disabled state for locked nodes
- Focus indicators preserved

#### Future Improvements
- Keyboard navigation system
- ARIA labels for screen readers
- Progress announcements

### Testing Insights

#### Position Testing Results
Through slider adjustments, discovered optimal snake curve:
- Start at ~40% horizontal
- Alternate between 35-60% range
- Wider swings create better curves
- Checkpoints at curve peaks

#### Visual Balance
- 140px vertical spacing optimal
- 15 nodes create good scroll length
- 3 checkpoints provide clear sections

### Maintenance Guidelines

#### Adding New Nodes
1. Add to nodes array
2. Position will be interpolated
3. Update PRODUCTION_POSITIONS if using fixed positions
4. Test on mobile and desktop

#### Changing Animation Speed
- Modify animation duration in CSS
- Adjust transition timing in components
- Test for motion sickness concerns

#### Color Scheme Updates
- Update gradient classes in component
- Modify ripple border colors
- Ensure contrast requirements met

### Lessons Learned

1. **Simplicity Wins**: Removing path lines created cleaner design
2. **Tools Help**: Adjustable version invaluable for finding positions
3. **Animation Restraint**: Subtle effects more effective than complex ones
4. **Mobile First**: Design decisions should prioritize mobile experience
5. **Flexibility**: Multiple implementation approaches provide options

### Debug Commands

```bash
# View all snake path routes
find src/app/practice -name "*.tsx" | grep -E "(snake|hiragana|katakana)"

# Check animation performance
# In browser console:
performance.mark('animation-start');
// ... interact with page ...
performance.mark('animation-end');
performance.measure('animation-duration', 'animation-start', 'animation-end');

# Export current positions (on adjustable page)
# Click "Export Positions to Console" button
```

### Version History

1. **v1**: SVG path with connecting lines
2. **v2**: Removed lines, added adjustable positions
3. **v3**: Added animated background
4. **v4**: Consolidated duplicate nodes
5. **v5**: Added ripple animations to all nodes

### Final Implementation Stats

- **Total Nodes**: 15
- **Active Pages**: 3 (Hiragana, Katakana, Conjugation)
- **Dummy Nodes**: 5 (numbered placeholders)
- **Checkpoints**: 3
- **Locked Nodes**: 3
- **Total Height**: ~2200px
- **Animation Types**: 4 (spring, pulse, ripple, float)