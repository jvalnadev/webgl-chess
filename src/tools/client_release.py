import shutil
import os
import sys
import subprocess

def failure(reason):
	print(reason)
	sys.exit(1)

# Recursively copy all files to a single-level destination
def copyCollapse(dir, dest):
	for path in os.listdir(dir):
		if os.path.isdir(dir + path):
			copyCollapse(dir + path + "/", dest)
		else:
			shutil.copy(dir + path, dest)

# Copy files from the base of a directory
def copyShallow(dir, dest):
	for path in os.listdir(dir):
		if not os.path.isdir(dir + path):
			shutil.copy(dir + path, dest)

source = "../client/"
shared = "../server/shared/"
testing = "../testing/"
release = "../../release/"

# Remove previous release
if os.path.exists(release):
	shutil.rmtree(release)

# Create new release directory
os.mkdir(release)

# Copy static files
shutil.copy(source + "index.php", release)
shutil.copytree(source + "lib/", release + "lib/")
shutil.copytree(source + "css/", release + "css/")
shutil.copytree(source + "img/", release + "img/")
shutil.copytree(source + "audio/", release + "audio/")
shutil.copytree(source + "mdl/tex/", release + "tex/")

# Create temporary directory for JS files
tmp = release + "tmp/"
os.mkdir(tmp)
# Copy JS source files
copyCollapse(source + "js/", tmp)
copyCollapse(shared, tmp)
copyShallow(source + "mdl/", tmp)

# Create JS files from shaders
if subprocess.call(["python", "transform_js/wrap_shaders.py", source + "glsl/", tmp]) != 0:
	failure("Failed to wrap shaders")

# Create JS files to load audio
if subprocess.call(["python", "transform_js/load_audio.py", source + "audio/", tmp]) != 0:
	failure("Failed to create audio loaders")

# Bundle temporary files into a single file
if subprocess.call(["python", "transform_js/bundle_js.py", tmp, release + "app.js"]) != 0:
	failure("Failed to bundle js")

# Remove temporary directory
shutil.rmtree(tmp)

# Copy test utils
shutil.copytree(testing, release + "testing/")
