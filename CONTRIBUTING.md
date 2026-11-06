# Contributing to Rumah Kita

Thank you for your interest in contributing to **Rumah Kita**! We welcome contributions from developers, smart-home enthusiasts, and community organizers around the world.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork & Clone the Repository**
   ```bash
   git clone https://github.com/NopeKagennnou/rumah-kita.git
   cd rumah-kita
   ```
2. **Run the Automated Test Suite**
   ```bash
   npm test
   ```
3. **Run the Syntax & Privacy Guard Audit**
   ```bash
   npm run lint
   npm run security:scan
   ```
4. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Privacy & Anti-Leak Requirements for Pull Requests

Every Pull Request is automatically verified by our GitHub Actions CI pipeline:
- **Never commit** `.env` files, personal SQLite/JSON databases, or local device paths.
- Ensure `npm run security:scan` and `npm test` pass with zero warnings before submitting your PR.

## License

By contributing to **Rumah Kita**, you agree that your contributions will be licensed under the [MIT License](LICENSE).
