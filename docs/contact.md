---
layout: default
title: Contact
description: Get in touch with the Altitude team for questions, support, or feature requests.
permalink: /contact.html
---

## Contact Us

Have questions about Altitude? Need help setting up investigations? Want to suggest a feature? We'd love to hear from you!

<div class="glass-panel" style="max-width: 600px; margin: 2rem auto;">
  <form id="contact-form" action="https://formsubmit.co/asalomon@bilomax.com" method="POST" target="_self">
    <input type="hidden" name="_captcha" value="false">
    <input type="hidden" name="_template" value="table">
    <input type="hidden" name="_autoresponse" value="Thank you for contacting Altitude! We've received your message and will get back to you soon.">
    <input type="hidden" name="_next" value="https://bizoton19.github.io/altitude/contact.html?success=true">
    
    <div style="margin-bottom: 1.5rem;">
      <label for="name" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-primary); font-weight: 500;">
        Name <span style="color: var(--color-risk-high);">*</span>
      </label>
      <input 
        type="text" 
        id="name" 
        name="name" 
        required
        style="width: 100%; padding: 0.75rem; background: var(--color-glass-bg); border: 1px solid var(--color-glass-border); border-radius: 8px; color: var(--color-text-primary); font-size: 1rem; box-sizing: border-box;"
      >
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label for="email" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-primary); font-weight: 500;">
        Email <span style="color: var(--color-risk-high);">*</span>
      </label>
      <input 
        type="email" 
        id="email" 
        name="email" 
        required
        style="width: 100%; padding: 0.75rem; background: var(--color-glass-bg); border: 1px solid var(--color-glass-border); border-radius: 8px; color: var(--color-text-primary); font-size: 1rem; box-sizing: border-box;"
      >
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label for="subject_select" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-primary); font-weight: 500;">
        Subject <span style="color: var(--color-risk-high);">*</span>
      </label>
      <select 
        id="subject_select" 
        name="_subject" 
        required
        style="width: 100%; padding: 0.75rem; background: var(--color-glass-bg); border: 1px solid var(--color-glass-border); border-radius: 8px; color: var(--color-text-primary); font-size: 1rem; box-sizing: border-box;"
      >
        <option value="Altitude Contact: General Question">General Question</option>
        <option value="Altitude Contact: Technical Support">Technical Support</option>
        <option value="Altitude Contact: Feature Request">Feature Request</option>
        <option value="Altitude Contact: Bug Report">Bug Report</option>
        <option value="Altitude Contact: Partnership Inquiry">Partnership Inquiry</option>
        <option value="Altitude Contact: Other">Other</option>
      </select>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label for="message" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-primary); font-weight: 500;">
        Message <span style="color: var(--color-risk-high);">*</span>
      </label>
      <textarea 
        id="message" 
        name="message" 
        rows="6" 
        required
        style="width: 100%; padding: 0.75rem; background: var(--color-glass-bg); border: 1px solid var(--color-glass-border); border-radius: 8px; color: var(--color-text-primary); font-size: 1rem; resize: vertical; font-family: inherit; box-sizing: border-box;"
        placeholder="Tell us how we can help..."
      ></textarea>
    </div>

    <button 
      type="submit"
      id="submit-btn"
      class="cta-button"
      style="width: 100%; margin-top: 1rem;"
    >
      Send Message
    </button>
  </form>

  <div id="form-success" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(0, 255, 136, 0.15); border: 1px solid var(--color-risk-low); border-radius: 8px; color: var(--color-risk-low); text-align: center;">
    <strong>✅ Message sent successfully!</strong><br>
    We'll get back to you soon.
  </div>

  <div id="form-error" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(255, 51, 102, 0.15); border: 1px solid var(--color-risk-high); border-radius: 8px; color: var(--color-risk-high); text-align: center;">
    <strong>❌ Error sending message.</strong><br>
    Please try again or email us directly at <a href="mailto:asalomon@bilomax.com" style="color: var(--color-accent-cyan);">asalomon@bilomax.com</a>
  </div>
</div>

## Alternative Contact Methods

- **Email:** [asalomon@bilomax.com](mailto:asalomon@bilomax.com)
- **GitHub Issues:** [Report issues or request features](https://github.com/bizoton19/altitude/issues)

<script>
// Handle form submission
document.getElementById('contact-form').addEventListener('submit', function(e) {
  const form = this;
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;
  document.getElementById('form-error').style.display = 'none';
  document.getElementById('form-success').style.display = 'none';
  
  // FormSubmit will handle the submission and redirect to _next
  // If JavaScript is disabled, the form will still work
});

// Check for success parameter in URL (from FormSubmit redirect)
if (window.location.search.includes('success=true')) {
  document.getElementById('form-success').style.display = 'block';
  document.getElementById('form-error').style.display = 'none';
  // Scroll to success message
  setTimeout(() => {
    document.getElementById('form-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
  // Clear the URL parameter
  window.history.replaceState({}, document.title, window.location.pathname);
}
</script>


