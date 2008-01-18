#!/usr/bin/env ruby
ARGV[0] ||= 'turk.js'
`cat js/base.js js/jsawesome.js >> js/#{ARGV[0]}`
`yuicompressor js/#{ARGV[0]}`
`mv js/#{ARGV[0].sub('.js','-min.js')} js/#{ARGV[0]}`
`scp js/#{ARGV[0]} sh1:/var/www/labs`
`rm js/#{ARGV[0]}`