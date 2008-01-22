#!/usr/bin/env ruby
ARGV[0] ||= 'turk.js'
compress = ARGV[1] || false
`cat js/base.js js/jsawesome.js >> js/#{ARGV[0]}`
if compress
  puts "Compressing..."
  `yuicompressor js/#{ARGV[0]}`
  `mv js/#{ARGV[0].sub('.js','-min.js')} js/#{ARGV[0]}`
else
  puts "Pushing non compressed"
end
scp = "scp js/#{ARGV[0]} sh1.doloreslabs.com:/var/www/assets"
puts `#{scp}`
`rm js/#{ARGV[0]}`