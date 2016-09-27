{
  "targets": [{
    "target_name": "cv8",
    "sources": [
        'src/init.cc',
        'src/cv8.cc'
    ],
    "include_dirs" : [
      "<!(node -e \"require('nan')\")"
    ]
  }]
}
