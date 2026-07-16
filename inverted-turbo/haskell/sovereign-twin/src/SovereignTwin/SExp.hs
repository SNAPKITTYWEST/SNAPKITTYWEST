{-# LANGUAGE DataKinds, GADTs, TypeFamilies #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables #-}

module SovereignTwin.SExp
  ( -- * S-expression AST
    SExp(..)
    -- * Translation
  , agdaToSExp
  , crToSExp
  , blockToThreaded
    -- * World dump
  , LispImage(..)
  , dumpWorld
  , defunctParent
  ) where

import Data.Kind (Type)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.ByteString as BS
import Data.Word (Word64)
import System.Process (callProcess)
import System.FilePath ((</>))

import SovereignTwin.ComputableRefinement
import SovereignTwin.InvertedBlock
import SovereignTwin.AST

-- | Lisp S-expression AST
data SExp where
  SAtom     :: Text -> SExp
  SList     :: [SExp] -> SExp
  SLambda   :: [Text] -> SExp -> SExp
  SClosure  :: BS.ByteString -> SExp     -- Serialized closure
  SComeFrom :: Word64 -> Word64 -> SExp  -- (trigger, handler)

-- | Lisp image (SBCL save-lisp-and-die output)
data LispImage where
  LispImage :: { imagePath   :: FilePath
               , entryPoint  :: SExp
               , heapSnapshot :: BS.ByteString
               } -> LispImage

-- | Translate ComputableRefinement to S-expression
crToSExp :: Show α => ComputableRefinement α P -> SExp
crToSExp (MkCR val _) =
  SList [ SAtom "computable-refinement"
        , SAtom (T.pack (show val))
        , SAtom "<property-closure>"
        ]

-- | Translate InvertedBlock to threaded Lisp vectors
blockToThreaded :: InvertedBlock w -> [SExp]
blockToThreaded (InvertedBlock _ _ entries exits handlers) =
  [ SList (SAtom "block" : map (SAtom . T.pack . show . unExecAddr) entries)
  , SList (SAtom "come-from-map" :
      map (\(t, h) -> SList [ SAtom "pair"
                             , SAtom (T.pack (show (unExecAddr t)))
                             , SAtom (T.pack (show (unExecAddr h)))]) handlers)
  ]
  where unExecAddr (ExecAddr w) = w

-- | Translate Agda AST to S-expression
agdaToSExp :: AgdaAST 'Validated -> SExp
agdaToSExp (AgdaModule name sigs proofs) =
  SList [ SAtom "agda-module"
        , SAtom name
        , SList (map typeSigToSExp sigs)
        , SList (map proofToSExp proofs)
        ]
  where
    typeSigToSExp (TypeSig n args) =
      SList [SAtom "sig", SAtom n, SList (map SAtom args)]
    proofToSExp (ProofTerm p) = SList [SAtom "proof", SAtom p]

-- | Dump world to SBCL image
dumpWorld :: SExp -> IO LispImage
dumpWorld sexp = do
  let imgPath = "sovereign_twin.image"
  callProcess "sbcl" [ "--non-interactive"
                      , "--eval", "(format t \"Saving sovereign twin image...~%\")"
                      , "--eval", "(sb-ext:save-lisp-and-die \"" ++ imgPath
                                  ++ "\" :executable t :toplevel (lambda () (format t \"SovereignTwin ready~%\")))"
                      ]
  BS.writeFile (imgPath ++ ".sexp") (serialize sexp)
  return LispImage { imagePath = imgPath, entryPoint = sexp, heapSnapshot = BS.empty }

-- | Serialize S-expression to bytes (placeholder)
serialize :: SExp -> BS.ByteString
serialize (SAtom t) = encodeUtf8 t
serialize (SList _) = encodeUtf8 "<list>"
serialize (SLambda _ _) = encodeUtf8 "<lambda>"
serialize (SClosure bs) = bs
serialize (SComeFrom t h) = encodeUtf8 (show t <> ":" <> show h)

encodeUtf8 :: Text -> BS.ByteString
encodeUtf8 = BS.pack . map (fromIntegral . fromEnum) . T.unpack

-- | Parent process defunct protocol
defunctParent :: LispImage -> IO ()
defunctParent _ = do
  putStrLn "Parent defunct — child process takes over"
