Pod::Spec.new do |s|
  s.name           = 'VolumeFire'
  s.version        = '1.0.0'
  s.summary        = 'Volume-change fire trigger for Pocket Draw'
  s.description    = 'Observes iOS system-volume changes during the duel FIRE phase.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Pocket Draw'
  s.homepage       = 'https://github.com/pix-l-crafters/pocket-draw'
  s.source         = { :git => 'https://github.com/pix-l-crafters/pocket-draw.git' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  s.source_files   = '*.swift'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
end
