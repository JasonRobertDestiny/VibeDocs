# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VibeDoc** is an AI-driven development plan generator built for the MCP Server development track of the MagicBuilder AI Hackathon 2025. It helps developers, entrepreneurs, and product managers quickly transform ideas into comprehensive technical development plans using AI.

### Core Architecture
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI Components**: Shadcn/UI + Radix UI + Tailwind CSS 4
- **AI Integration**: Silicon Flow API with Qwen2.5-72B-Instruct model
- **Deployment**: Docker containerization for MagicBuilder ModelScope platform

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint for code quality
```

### Environment Setup
- Copy `.env.local.example` to `.env.local` 
- Set `SILICONFLOW_API_KEY` with your Silicon Flow API key
- Port defaults to 3000 via `cross-env PORT=${PORT:-3000}`

## Key Architecture Components

### SOP Template System (`lib/sop-template.ts`)
- Defines 7-step development planning workflow
- Contains 28 structured fields covering product planning, tech stack, deployment, marketing, analytics, and optimization
- Each field has: `id`, `label`, `type`, `required`, `placeholder`, and `recommendations`
- Used by both manual wizard and AI generation modes

### AI Generation Pipeline (`app/api/auto-generate-plan/route.ts`)
- Extracts all field IDs from SOP_TEMPLATE dynamically
- Constructs structured prompt requiring JSON response with exact field mapping
- Calls Silicon Flow API with Qwen2.5-72B-Instruct model
- Validates and sanitizes AI response, filling missing fields automatically
- Returns structured plan data for frontend consumption

### Dual-Mode Interface (`app/page.tsx`)
- **AI Generation Mode**: Single textarea input → 30-second AI-generated complete plan
- **Manual Wizard Mode**: Step-by-step guided form with 7 sections
- **Generated Document View**: Markdown output with copy-to-clipboard code blocks
- Seamless switching between modes with state preservation

### UI Component Structure
- Uses Shadcn/UI components: `Card`, `Button`, `Input`, `Textarea`, `Label`
- Custom `CodeBlock` component with copy functionality for generated prompts
- Responsive design with Tailwind CSS classes
- Dark mode support throughout interface

## Development Workflow

### Adding New SOP Fields
1. Update `SOP_TEMPLATE` in `lib/sop-template.ts`
2. AI endpoint automatically picks up new field IDs
3. Update prompt template in `route.ts` if needed
4. Frontend wizard automatically renders new fields

### Modifying AI Prompts
- Master prompt is in `app/api/auto-generate-plan/route.ts:33-74`
- Includes field validation and structured JSON requirements
- AI assistant prompt generation is in `app/page.tsx:119-205`

### Styling Guidelines
- Use Tailwind CSS classes following existing patterns
- Maintain consistency with Shadcn/UI component styling
- Preserve responsive design patterns (`max-w-2xl mx-auto`, etc.)

## Important Implementation Details

### State Management
- React useState for form data, wizard navigation, and mode switching
- `answers` object uses field IDs as keys for consistent data mapping
- `generatedMarkdown` stores final document output

### Error Handling
- API route includes comprehensive error handling and logging
- Frontend shows user-friendly error messages in Chinese
- Graceful fallback for missing AI response fields

### TypeScript Configuration
- Strict mode enabled with modern ES2017 target
- Path aliases: `@/*` maps to project root
- Next.js plugin integration for optimal bundling

### Performance Considerations
- Uses `cross-env` for cross-platform environment variable handling
- Tailwind CSS 4 with modern PostCSS configuration
- React 19 with Next.js 15 for latest performance optimizations

## MCP Server Integration

This project is designed for deployment on MagicBuilder ModelScope platform as an MCP Server:

### Required Environment Variables
- `SILICONFLOW_API_KEY`: Silicon Flow API key for AI generation
- `NODE_ENV`: Set to "production" for deployment
- `PORT`: Service port (default: 3000)

### Docker Configuration
- Uses Node.js base image with development dependencies for build
- Multi-stage build process for optimized production image
- Exposes port 3000 for web service access

## Testing & Quality

- ESLint configuration with Next.js rules
- TypeScript strict mode for type safety
- No specific test framework configured - add testing setup as needed
- Manual testing should cover both AI generation and wizard modes