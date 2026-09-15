const { error } = await client.from('reviews').insert({
  name: name,
  country: country,
  stars: stars,
  review: message,
  message: message,
  status: 'pending',
  active: false
});

if (error) {
  console.error('Review submit error:', error);
  alert('Review submit failed. Please try again.');
  return;
}

alert('Thank you! Your review has been submitted.');
