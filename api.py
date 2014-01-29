#~ /* 
 #~ * Copyright (c) 2014 Michael Chaberski.
 #~ * All rights reserved.
 #~ * Distributed under BSD (3-clause) license.
 #~ */

import base64
import webapp2
import jinja2
import os.path
import json
import logging
import re
from scramble import FaceScrambler

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class DataUriParser:
    
    def __init__(self):
        pass
    
    def parse(self, uri):
        m = re.match(r'^data:(?P<mime_type>[\w/]+);(?P<encoding>[\w]+),(?P<data>[-/\+=\w]+)$', uri)
        if m is None: raise ValueError("could not parse uri of length {}".format(len(uri)))
        return m.group('mime_type'), m.group('encoding'), m.group('data')

_FLOAT_FIELDS = ('x', 'y', 'width', 'height', 'confidence', 
        'relativeWidth', 'relativeHeight', 'relativeX', 'relativeY')
_STRING_FIELDS = ('scrambleMethod',)
_INT_FIELDS = ('index', 'neighbors')
_BOOL_FIELDS = ('scrambled',)

class Api(webapp2.RequestHandler):
    
    def _typed(self, fieldname, value):
        if fieldname in _INT_FIELDS: typ = int
        elif fieldname in _BOOL_FIELDS: 
            typ = bool
            value = value == 'true'
        elif fieldname in _FLOAT_FIELDS: typ  = float
        elif fieldname in _STRING_FIELDS: typ = str
        else: 
            logging.warn(" unrecognized field name: " + fieldname)
            return value
        return typ(value)
    
    def _parse_faces(self, post_items):
        d = {}
        for k, v in post_items:
            m = re.match(r'^faces\[(\d+)\]\[(\w+)\]$', k)
            if m is not None:
                index, field = m.group(1), m.group(2)
                if index in d: face = d[index]
                else:
                    face = {}
                    d[index] = face
                face[field] = self._typed(field, v)
        return list(d.values())
    
    def post(self):
        if self.request.path == '/api/scramble':
            self.response.headers['Content-Type'] = 'application/json'
            items = self.request.POST.items()
            faces = self._parse_faces(items)
            logging.info(" {} faces; {}".format(len(faces), str(faces[:2])))
            mime_type, encoding, data = DataUriParser().parse(self.request.get('src'))
            logging.info(" src data = {}".format(data[:128]))
            src_image_bytes = base64.b64decode(data)
            scrambler = FaceScrambler()
            output_image_data = scrambler.scramble(src_image_bytes, faces).encode('base64')
            data_uri = "data:image/jpeg;base64,{}".format(output_image_data)
            response_content = { 
				'scrambledDataUri': data_uri,
				'statusCode': 0
			}
            output = json.dumps(response_content)
            self.response.write(output)
            self.response.status = 200
        else:
            self.response.status = 404
            self.response.write("<h1>404 not found</h1>")

#~ class MainPage(webapp2.RequestHandler):
#~ 
    #~ def get(self):
        #~ self.response.headers['Content-Type'] = 'text/html'
        #~ template = JINJA_ENVIRONMENT.get_template('files/templates/index.html')
        #~ self.response.write(template.render({}))


application = webapp2.WSGIApplication([
    ('/api/scramble.*', Api),
], debug=True)
