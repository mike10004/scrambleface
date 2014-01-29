#~ /* 
 #~ * Copyright (c) 2014 Michael Chaberski.
 #~ * All rights reserved.
 #~ * Distributed under BSD (3-clause) license.
 #~ */

from PIL import Image
from StringIO import StringIO
import logging
from PIL import ImageFilter

_log = logging.getLogger("scramble")

class ScrambleMethod:
    
    def __init__(self, name):
        self.name = name
    
    def apply(self, image, face):
        raise NotImplementedError("abstract")
    
    def get_face_size(self, face):
        return int(round(face['width'])), int(round(face['height']))
    
    def get_face_location(self, face):
        return int(round(face['x'])), int(round(face['y']))

class PastingMethod(ScrambleMethod):
    
    def __init__(self, name):
        ScrambleMethod.__init__(self, name)

    def create_replacement(self, image, face):
        raise NotImplementedError("abstract")

    def apply(self, image, face):
        replacement, location = self.create_replacement(image, face)
        _log.info(" pasting %s (size = %s) at %s", replacement, replacement.size, location)
        image.paste(replacement, location)

class Blackout(PastingMethod):
    
    def __init__(self):
        PastingMethod.__init__(self, 'blackout')

    def create_replacement(self, image, face):
        w, h = self.get_face_size(face)
        redaction = Image.new('L', (w, h))
        location = self.get_face_location(face)
        return redaction, location


class GaussianBlur(PastingMethod):
    
    def __init__(self):
        PastingMethod.__init__(self, 'gaussian')
        self.radius = 15

    def create_replacement(self, image, face):
        w, h = self.get_face_size(face)
        left, upper = self.get_face_location(face)
        right, lower = left + w, upper + h
        _log.info(" blurring face of size %dx%d", w, h)
        blurred = image.crop((left, upper, right, lower))
        blurred.load()
        blurred = blurred.filter(ImageFilter.GaussianBlur(radius=self.radius))
        location = (left, upper)
        return blurred, location

def get_method_instance(method_name):
    if method_name == 'blackout':
        return Blackout()
    elif method_name == 'gaussian':
        return GaussianBlur()
    else:
        raise ValueError("invalid method name: " + method_name)

class FaceScrambler:
    
    def __init__(self):
        self.method = 'blackout'
        self.debug = False

    def scramble(self, image_bytes, faces):
        fp = StringIO(image_bytes)
        im = Image.open(fp)
        if self.debug: im.save('/tmp/scrambleinput.jpg')
        for face in faces:
            if face['scrambled']:
                method = get_method_instance(face['scrambleMethod'])
                method.apply(im, face)
        output = StringIO()
        im.save(output, format='jpeg')
        if self.debug: im.save('/tmp/scrambleoutput.jpg')
        return output.getvalue()
