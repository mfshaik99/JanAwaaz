const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace transition-all with google-transition
  content = content.replace(/transition-all/g, 'google-transition');
  content = content.replace(/transition-colors/g, 'google-transition');
  content = content.replace(/transition-shadow/g, 'google-transition');
  
  // Replace shadow-sm with google-shadow-sm for cards
  content = content.replace(/shadow-sm/g, 'google-shadow-sm');
  content = content.replace(/hover:shadow-md/g, 'hover:google-shadow-md');
  
  // Add proper easing to framer motion components where transition is explicit
  content = content.replace(/transition=\{\{([^}]+)\}\}/g, (match, p1) => {
    if (!p1.includes('ease')) {
      return `transition={{ ${p1.trim()}, ease: [0.4, 0, 0.2, 1] }}`;
    }
    return match;
  });
  
  // Make sure we have proper easing when transition is implicit in initial/animate
  // This is a bit tricky, let's just add a generic transition to motion.div without one
  content = content.replace(/<motion\.div([^>]*)>/g, (match, p1) => {
    if (p1.includes('initial=') && !p1.includes('transition=')) {
      return `<motion.div${p1} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>`;
    }
    return match;
  });

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${filePath}`);
}

const files = [
  'src/components/CitizenPortal.tsx',
  'src/components/SubmitRequest.tsx',
  'src/components/Dashboard.tsx',
  'src/components/Login.tsx',
  'src/components/Register.tsx',
  'src/components/Layout.tsx',
  'src/App.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    processFile(f);
  }
});
