# LearnGraph - Rootvestors Integration Guide

## Overview
LearnGraph is now fully integrated with the Rootvestors brand theme and your backend at `http://localhost:3700`. The application features modern animations powered by Framer Motion and D3.js for knowledge graph visualization.

## Brand Integration

### Colors
The application now uses Rootvestors' official brand colors:
- **Primary**: Maximum Green Yellow (#CCEB58)
- **Secondary**: Lime Light (#EDF8C3)
- **Dark**: Raisin Black (#222222)
- **Light**: White (#FFFFFF)
- **Gradient**: `linear-gradient(135deg, #CCEB58, #EDF8C3)`
- **Shadow**: `0 4px 24px rgba(204, 235, 88, 0.15)`

### Typography
- **Font Family**: Reddit Sans (weights: 400, 500, 600, 700)
- **Hero Headings**: 40–56px, Bold (700)
- **Section Headings**: 24–32px, SemiBold (600)
- **Card Titles**: 16–20px, Medium (500)
- **Body Text**: 14–16px, Regular (400)
- **Labels/Captions**: 12px, Regular (400)

### CSS Variables
Located in `app/globals.css`:
```css
--rv-black: #222222
--rv-lime: #CCEB58
--rv-lime-light: #EDF8C3
--rv-white: #FFFFFF
--rv-gradient: linear-gradient(135deg, #CCEB58, #EDF8C3)
--rv-shadow: 0 4px 24px rgba(204, 235, 88, 0.15)
```

Tailwind utility classes available:
- `bg-rv-gradient` - Lime gradient background
- `text-rv-lime` - Lime text color
- `text-rv-lime-light` - Light lime text
- `text-rv-black` - Black text
- `shadow-rv` - Rootvestors shadow

## Backend Integration

### API Base URL
All API calls are configured to use: `http://localhost:3700`

Located in: `lib/api.ts`

### Available Endpoints

#### Students
- `POST /api/students` - Register or find student
- `GET /api/students/:id` - Get student details

#### Chapters
- `GET /api/chapters` - Get all chapters
- `GET /api/chapters/:id` - Get chapter details

#### Subtopics
- `GET /api/chapters/:id/subtopics` - Get subtopics by chapter
- `GET /api/chapters/:id/subtopics/:subtopicId` - Get subtopic details

#### Content Generation
- `POST /api/content/generate-passage` - Generate learning passage

#### Quiz
- `GET /api/quiz/questions` - Get quiz questions
- `POST /api/quiz/submit` - Submit quiz answers

#### Knowledge Graph
- `GET /api/graph/:studentId` - Get student knowledge graph

#### History
- `GET /api/history/:studentId` - Get student quiz history

## Animation Features

### Framer Motion Animations
The application includes comprehensive animations:
- **Page Transitions**: Smooth fade and slide animations
- **Staggered Components**: Items animate in sequence for visual appeal
- **Interactive Elements**: Hover effects on buttons and cards
- **Progress Reveals**: Mastery bars animate from 0 to target percentage
- **Score Reveals**: Quiz results show with spring animations
- **MCQ Options**: Quiz options slide in one by one
- **Floating Elements**: Background elements animate subtly

### Animation Utilities
Located in: `lib/animations.ts`

Key animation variants:
- `containerVariants` - Staggered child animations
- `itemVariants` - Individual element animations
- `pageVariants` - Full page transitions
- `mcqOptionVariants` - Quiz option slide-ins
- `scoreRevealVariants` - Score display animations
- `masteryBarVariants` - Progress bar fills
- `floatVariants` - Gentle floating animations
- `pulseVariants` - Pulsing animations

### D3 Knowledge Graph
Located in: `components/knowledge-graph-d3.tsx`

Features:
- **Force-Directed Layout**: Nodes repel and attract based on force simulation
- **Interactive Nodes**: Drag nodes to reorganize the graph
- **Mastery Visualization**: Node size and color represent mastery levels
  - 80%+ Mastery: Lime (#CCEB58)
  - 50%+ Mastery: Light Lime (#EDF8C3)
  - <50% Mastery: Gray (#E5E5E5)
- **Connected Topics**: Links show relationships between topics

## Pages & Routes

### Landing Page (`/`)
- Hero section with animated gradient background
- Feature highlights with pulsing dots
- Student registration form
- Fully responsive design

### Onboarding (`/onboarding`)
- Chapter selection interface
- Multiple chapter cards with selection state
- Continue button triggers dashboard

### Dashboard (`/dashboard`)
- Stats grid showing:
  - Total chapters
  - Topics in progress
  - Average mastery percentage
- Chapter cards with:
  - Mastery progress bars (animated)
  - Hover effects
  - Clickable to view chapter details
- Protected route (requires authentication)

### Chapter Detail (`/chapter/:id`)
- List of subtopics in chapter
- Mastery status for each subtopic
- Lock/unlock indicators
- "Take Quiz" button for each subtopic

### Subtopic View (`/chapter/:id/subtopic/:subtopicId`)
- AI-generated passage display
- Passage text with fade-in animations
- "Take Quiz" button to start assessment

### Quiz Session (`/chapter/:id/subtopic/:subtopicId/quiz`)
- MCQ questions displayed one at a time
- Progress indicator (e.g., 2/5)
- Options slide in sequentially
- Answer selection with visual feedback
- Navigation buttons (Previous/Next/Submit)

### Results Page (`/results/:sessionId`)
- Score reveal animation
- Confetti animation for scores ≥75%
- Per-question breakdown
- "Continue Learning" and "Go to Dashboard" CTAs
- Updated mastery bar animation

### Progress Page (`/progress`)
- Overall mastery percentage
- Statistics cards
- Interactive D3 knowledge graph
- Quiz history table with dates
- Last 10 quiz sessions displayed

## Rate Limiting

The API implements rate limiting for content generation:
- **Limit**: 10 requests per 15 minutes per student
- **Status Code**: 429 (Too Many Requests)
- **Handling**: Automatic retry with exponential backoff

Error handling implemented in `lib/api.ts` with toast notifications for user feedback.

## State Management

Uses Zustand for student state management:
- Student ID and name
- Chapter progress tracking
- Current chapter context
- Persistent localStorage storage

Located in: `lib/store.ts`

## Testing the Integration

### 1. Start the Backend
```bash
# Your backend should be running on http://localhost:3700
```

### 2. Start the Dev Server
```bash
cd /vercel/share/v0-project
pnpm dev
```

### 3. Access the Application
- Open `http://localhost:3000` in your browser
- You should see the Rootvestors-branded landing page with the gradient background

### 4. Test the Flow
1. **Landing**: See the lime gradient background and Rootvestors branding
2. **Registration**: Enter name and email to register
3. **Onboarding**: Select chapters to begin learning
4. **Dashboard**: View chapters with animated mastery bars
5. **Quiz**: Take quizzes and see animated score reveals
6. **Progress**: View the interactive knowledge graph

## Component Structure

```
app/
├── page.tsx                           # Landing page
├── onboarding/page.tsx               # Chapter selection
├── dashboard/page.tsx                # Main dashboard
├── chapter/[id]/page.tsx             # Chapter details
├── chapter/[id]/subtopic/[subtopicId]/page.tsx  # Subtopic
├── chapter/[id]/subtopic/[subtopicId]/quiz/page.tsx  # Quiz
└── progress/page.tsx                 # Knowledge graph & history

components/
├── knowledge-graph-d3.tsx            # D3 interactive graph
├── route-guard.tsx                   # Authentication wrapper
├── toast-provider.tsx                # Notification system
├── button.tsx                        # Custom button component
├── card.tsx                          # Custom card component
└── [other UI components]

lib/
├── api.ts                            # Backend API integration
├── store.ts                          # Zustand state management
└── animations.ts                     # Framer Motion variants
```

## Customization

### Changing Colors
Update the CSS variables in `app/globals.css`:
```css
:root {
  --rv-lime: #CCEB58;  /* Change primary color */
  --rv-black: #222222; /* Change text color */
  /* ... etc */
}
```

### Adding New Animations
Add variants to `lib/animations.ts` and import in components:
```typescript
import { newVariant } from '@/lib/animations';
```

### Modifying API Endpoints
Update endpoints in `lib/api.ts` to match your backend structure.

## Deployment

When deploying to production:
1. Update `API_BASE_URL` in `lib/api.ts` to your production backend
2. Build with `pnpm build`
3. Deploy using `pnpm start` or your preferred hosting

## Troubleshooting

### API Connection Issues
- Verify backend is running on `http://localhost:3700`
- Check browser console for CORS errors
- Ensure API endpoint paths match your backend

### Missing Fonts
- Reddit Sans is loaded from Google Fonts
- Fallback to system fonts if unavailable
- Check `app/layout.tsx` for font configuration

### Animation Performance
- If animations lag, reduce `staggerChildren` duration in `lib/animations.ts`
- Check browser DevTools Performance tab
- Ensure hardware acceleration is enabled

## Support
For integration issues or questions, refer to:
- Backend API documentation
- Rootvestors brand guidelines
- Framer Motion docs: https://www.framer.com/motion/
- D3.js docs: https://d3js.org/

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Brand**: Rootvestors - "Transforming Nation from Roots to Reality"
