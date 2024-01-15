require 'json'

body = JSON.parse(ARGF.read)
body['packages'].reject! do |v|
  # remove fields that the GitHub Dependency Submission API doesn't like
  v['name'].start_with?('golang-version:') ||
    v['name'].start_with?('pep621:')
end

puts JSON.generate(body)
