# Contributing to Catalogue Creator

Thank you for your interest in contributing to the Catalogue Creator! This project is designed to help businesses create professional product catalogues from their Shopify stores.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A Shopify store with Admin API access
- Git

### Local Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/catalogue-creator.git
   cd catalogue-creator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Shopify credentials
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open in Browser**
   ```
   http://localhost:3000
   ```

## 🛠 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### File Structure
```
├── lib/                 # Utility functions and Shopify integration
├── pages/              # Next.js pages and API routes
│   ├── api/           # API endpoints
│   └── index.tsx      # Main application page
├── styles/            # CSS styles
└── public/            # Static assets
```

### API Development
- All API routes should be in `pages/api/`
- Use proper HTTP status codes
- Include error handling
- Add input validation
- Document API endpoints

## 🐛 Bug Reports

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/device information
- Screenshots if applicable

## ✨ Feature Requests

When suggesting features:
- Describe the use case
- Explain the benefit
- Consider implementation complexity
- Check if it aligns with project goals

## 🔧 Common Development Tasks

### Adding New Export Formats
1. Create new API endpoint in `pages/api/render/`
2. Add UI button in `pages/index.tsx`
3. Update README.md documentation
4. Test thoroughly

### Adding New Metafields
1. Update GraphQL query in `lib/shopify.ts`
2. Update type definitions
3. Update processing logic
4. Test with real data

### Styling Changes
1. Modify CSS in `styles/` directory
2. Test on different screen sizes
3. Ensure print compatibility
4. Update documentation

## 🧪 Testing

### Manual Testing
- Test all export formats
- Test filtering functionality
- Test on different devices
- Test with various product catalogs

### API Testing
- Test all API endpoints
- Test error scenarios
- Test with invalid data
- Test performance with large datasets

## 📝 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Test thoroughly
   - Update documentation if needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub

### PR Guidelines
- Use descriptive titles
- Include detailed descriptions
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass

## 📋 Code Review

All code changes require review before merging:
- Check code quality and style
- Verify functionality works as expected
- Ensure documentation is updated
- Test on different environments

## 🎯 Project Goals

This project aims to:
- Provide easy-to-use catalogue creation
- Support multiple export formats
- Work seamlessly with Shopify
- Be customizable and extensible
- Maintain high code quality

## 📞 Support

- Create an issue for bug reports
- Use discussions for questions
- Check existing issues before creating new ones
- Be respectful and constructive

## 📄 License

This project is private and proprietary. Please respect the license terms.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to make Catalogue Creator better! 🎉
