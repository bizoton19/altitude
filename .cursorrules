# Development Rules

1. Always check in code after significant files changes to avoid pending changes during crash.

2. For React: always use zod for validation.

3. Use snake_case for database columns, prefer simple react architecture.

4. **CSS, Styling Themes, Layouts, and UI/UX:**
   - Always stick to the current CSS styling system and theme. The application uses a "Futuristic Liquid Glass" theme with CSS variables defined in `src/styles/glass-theme.css`.
   - **Use CSS Variables**: Always use CSS custom properties (CSS variables) from the glass theme:
     - Spacing: `var(--space-xs)`, `var(--space-sm)`, `var(--space-md)`, `var(--space-lg)`, `var(--space-xl)`, `var(--space-xxl)`
     - Colors: `var(--neon-cyan)`, `var(--neon-purple)`, `var(--neon-pink)`, `var(--neon-blue)`
     - Glass effects: `var(--glass-bg)`, `var(--glass-bg-hover)`, `var(--glass-border)`, `var(--glass-border-hover)`
     - Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
     - Risk colors: `var(--risk-high)`, `var(--risk-medium)`, `var(--risk-low)`
     - Backgrounds: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-gradient)`
   - **Glass Panel Class**: Use `className="glass-panel"` for card/container components - this provides the glassmorphism effect with blur and transparency.
   - **Layout Patterns**: Follow existing layout patterns:
     - Use inline styles with CSS variables for component-specific styling
     - Prefer flexbox/grid layouts using CSS variables for spacing
     - Maintain consistent padding, margins, and spacing using the space variables
   - **Do NOT use**: Tailwind CSS classes, hardcoded colors, hardcoded spacing values, or external CSS frameworks. The app uses a custom CSS variable-based system.
   - **UI/UX Consistency**: 
     - Maintain the futuristic glass aesthetic throughout
     - Use neon accent colors for interactive elements (buttons, links, highlights)
     - Apply hover effects using `var(--glass-bg-hover)` and `var(--glass-border-hover)`
     - Use transitions with `var(--transition-fast)` for smooth interactions
     - Follow existing component patterns for buttons, cards, forms, and navigation
   - **Theme Support**: The styling system supports both dark (default) and light themes via `[data-theme="dark"]` and `[data-theme="light"]` - CSS variables automatically adjust.
   - **Reference**: Check `src/styles/glass-theme.css` for all available CSS variables and `src/components/` for styling examples.

