require 'json'

body = JSON.parse(File.read('out/github-dagger-dagger.json.spdx2.3.json'))
body['packages'].reject! do |v|
  # remove fields that the GitHub Dependency Submission API doesn't like
  v['name'].start_with? 'golang-version:'
end

puts JSON.generate(body)
