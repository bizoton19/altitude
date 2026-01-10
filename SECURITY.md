# Security Considerations

## Package Manager: pnpm

This project uses **pnpm** instead of npm for enhanced security. Here's why:

### Security Benefits

1. **Content-Addressable Storage**
   - Packages are stored by content hash, preventing tampering
   - Duplicate packages are automatically deduplicated
   - Ensures package integrity across installations

2. **Strict Dependency Resolution**
   - Reduces risk of dependency confusion attacks
   - Prevents unauthorized package access
   - Better isolation between projects

3. **Stricter Peer Dependencies**
   - Prevents version conflicts
   - Reduces security vulnerabilities from mismatched dependencies
   - Better compatibility checking

4. **Isolated Dependencies**
   - Each package only has access to its declared dependencies
   - Prevents unauthorized access to other packages
   - Better security boundaries

### Configuration

The project uses strict settings in `.npmrc`:
- `strict-peer-dependencies=true` - Enforces strict peer dependency resolution
- `shamefully-hoist=false` - Uses content-addressable storage
- `optional=false` - Prevents installation of optional dependencies by default

### Best Practices

1. **Always use pnpm**: Use `pnpm install` instead of `npm install`
2. **Commit pnpm-lock.yaml**: This ensures reproducible builds
3. **Regular audits**: Run `pnpm audit` regularly to check for vulnerabilities
4. **Update dependencies**: Keep dependencies up to date with `pnpm update`

### Running Security Audits

```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically fixable issues
pnpm audit --fix
```

### Alternative Package Managers

While pnpm is recommended, you can use:
- **yarn**: `yarn install` (also has good security features)
- **npm**: `npm install` (less secure, but compatible)

However, pnpm provides the best security model for this project.




## Package Manager: pnpm

This project uses **pnpm** instead of npm for enhanced security. Here's why:

### Security Benefits

1. **Content-Addressable Storage**
   - Packages are stored by content hash, preventing tampering
   - Duplicate packages are automatically deduplicated
   - Ensures package integrity across installations

2. **Strict Dependency Resolution**
   - Reduces risk of dependency confusion attacks
   - Prevents unauthorized package access
   - Better isolation between projects

3. **Stricter Peer Dependencies**
   - Prevents version conflicts
   - Reduces security vulnerabilities from mismatched dependencies
   - Better compatibility checking

4. **Isolated Dependencies**
   - Each package only has access to its declared dependencies
   - Prevents unauthorized access to other packages
   - Better security boundaries

### Configuration

The project uses strict settings in `.npmrc`:
- `strict-peer-dependencies=true` - Enforces strict peer dependency resolution
- `shamefully-hoist=false` - Uses content-addressable storage
- `optional=false` - Prevents installation of optional dependencies by default

### Best Practices

1. **Always use pnpm**: Use `pnpm install` instead of `npm install`
2. **Commit pnpm-lock.yaml**: This ensures reproducible builds
3. **Regular audits**: Run `pnpm audit` regularly to check for vulnerabilities
4. **Update dependencies**: Keep dependencies up to date with `pnpm update`

### Running Security Audits

```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically fixable issues
pnpm audit --fix
```

### Alternative Package Managers

While pnpm is recommended, you can use:
- **yarn**: `yarn install` (also has good security features)
- **npm**: `npm install` (less secure, but compatible)

However, pnpm provides the best security model for this project.





## Package Manager: pnpm

This project uses **pnpm** instead of npm for enhanced security. Here's why:

### Security Benefits

1. **Content-Addressable Storage**
   - Packages are stored by content hash, preventing tampering
   - Duplicate packages are automatically deduplicated
   - Ensures package integrity across installations

2. **Strict Dependency Resolution**
   - Reduces risk of dependency confusion attacks
   - Prevents unauthorized package access
   - Better isolation between projects

3. **Stricter Peer Dependencies**
   - Prevents version conflicts
   - Reduces security vulnerabilities from mismatched dependencies
   - Better compatibility checking

4. **Isolated Dependencies**
   - Each package only has access to its declared dependencies
   - Prevents unauthorized access to other packages
   - Better security boundaries

### Configuration

The project uses strict settings in `.npmrc`:
- `strict-peer-dependencies=true` - Enforces strict peer dependency resolution
- `shamefully-hoist=false` - Uses content-addressable storage
- `optional=false` - Prevents installation of optional dependencies by default

### Best Practices

1. **Always use pnpm**: Use `pnpm install` instead of `npm install`
2. **Commit pnpm-lock.yaml**: This ensures reproducible builds
3. **Regular audits**: Run `pnpm audit` regularly to check for vulnerabilities
4. **Update dependencies**: Keep dependencies up to date with `pnpm update`

### Running Security Audits

```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically fixable issues
pnpm audit --fix
```

### Alternative Package Managers

While pnpm is recommended, you can use:
- **yarn**: `yarn install` (also has good security features)
- **npm**: `npm install` (less secure, but compatible)

However, pnpm provides the best security model for this project.




## Package Manager: pnpm

This project uses **pnpm** instead of npm for enhanced security. Here's why:

### Security Benefits

1. **Content-Addressable Storage**
   - Packages are stored by content hash, preventing tampering
   - Duplicate packages are automatically deduplicated
   - Ensures package integrity across installations

2. **Strict Dependency Resolution**
   - Reduces risk of dependency confusion attacks
   - Prevents unauthorized package access
   - Better isolation between projects

3. **Stricter Peer Dependencies**
   - Prevents version conflicts
   - Reduces security vulnerabilities from mismatched dependencies
   - Better compatibility checking

4. **Isolated Dependencies**
   - Each package only has access to its declared dependencies
   - Prevents unauthorized access to other packages
   - Better security boundaries

### Configuration

The project uses strict settings in `.npmrc`:
- `strict-peer-dependencies=true` - Enforces strict peer dependency resolution
- `shamefully-hoist=false` - Uses content-addressable storage
- `optional=false` - Prevents installation of optional dependencies by default

### Best Practices

1. **Always use pnpm**: Use `pnpm install` instead of `npm install`
2. **Commit pnpm-lock.yaml**: This ensures reproducible builds
3. **Regular audits**: Run `pnpm audit` regularly to check for vulnerabilities
4. **Update dependencies**: Keep dependencies up to date with `pnpm update`

### Running Security Audits

```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically fixable issues
pnpm audit --fix
```

### Alternative Package Managers

While pnpm is recommended, you can use:
- **yarn**: `yarn install` (also has good security features)
- **npm**: `npm install` (less secure, but compatible)

However, pnpm provides the best security model for this project.




