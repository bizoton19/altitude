---
layout: default
title: Contact
description: Get in touch with the Altitude team for questions, support, or feature requests.
permalink: /contact.html
---

## Contact Us

Have questions about Altitude? Need help setting up investigations? Want to suggest a feature? We'd love to hear from you!

<div class="glass-panel contact-panel">
  <form id="contact-form" action="https://formsubmit.co/asalomon@bilomax.com" method="POST" target="_self">
    <input type="hidden" name="_captcha" value="false">
    <input type="hidden" name="_template" value="table">
    <input type="hidden" name="_autoresponse" value="Thank you for contacting Altitude! We've received your message and will get back to you soon.">
    <input type="hidden" name="_next" value="{{ '/contact.html?success=true' | relative_url | prepend: site.url }}">
    
    <div class="form-field">
      <label for="name" class="form-label">
        Name <span class="required">*</span>
      </label>
      <input 
        type="text" 
        id="name" 
        name="name" 
        required
        class="form-input"
      >
    </div>

    <div class="form-field">
      <label for="email" class="form-label">
        Email <span class="required">*</span>
      </label>
      <input 
        type="email" 
        id="email" 
        name="email" 
        required
        class="form-input"
      >
    </div>

    <div class="form-field">
      <label for="phone" class="form-label">
        Phone Number
      </label>
      <input 
        type="tel" 
        id="phone" 
        name="phone" 
        class="form-input"
        placeholder="Optional"
      >
    </div>

    <div class="form-field">
      <label for="website" class="form-label">
        Organization Website <span class="required">*</span>
      </label>
      <input 
        type="url" 
        id="website" 
        name="website" 
        required
        class="form-input"
        placeholder="https://example.com"
      >
    </div>

    <div class="form-field">
      <label for="subject_select" class="form-label">
        Subject <span class="required">*</span>
      </label>
      <select 
        id="subject_select" 
        name="_subject" 
        required
        class="form-select"
      >
        <option value="Altitude Contact: General Question">General Question</option>
        <option value="Altitude Contact: Technical Support">Technical Support</option>
        <option value="Altitude Contact: Feature Request">Feature Request</option>
        <option value="Altitude Contact: Bug Report">Bug Report</option>
        <option value="Altitude Contact: Partnership Inquiry">Partnership Inquiry</option>
        <option value="Altitude Contact: Other">Other</option>
      </select>
    </div>

    <div class="form-field">
      <label for="message" class="form-label">
        Message <span class="required">*</span>
      </label>
      <textarea 
        id="message" 
        name="message" 
        rows="6" 
        required
        class="form-textarea"
        placeholder="Tell us how we can help..."
      ></textarea>
    </div>

    <button 
      type="submit"
      id="submit-btn"
      class="cta-button btn-block"
    >
      Send Message
    </button>
  </form>

  <div id="form-success" class="form-alert success" style="display: none;">
    <strong>✅ Message sent successfully!</strong><br>
    We'll get back to you soon.
  </div>

  <div id="form-error" class="form-alert error" style="display: none;">
    <strong>❌ Error sending message.</strong><br>
    Please try again or email us directly at <a href="mailto:asalomon@bilomax.com" class="form-note-link">asalomon@bilomax.com</a>
  </div>
</div>



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


